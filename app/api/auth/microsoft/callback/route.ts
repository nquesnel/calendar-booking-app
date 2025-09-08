import { NextRequest, NextResponse } from 'next/server'
import { getMicrosoftTokens } from '@/lib/calendar/microsoft'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    
    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?error=auth_failed`
      )
    }
    
    // Decode state
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    const { token, email, name, provider, type } = stateData
    
    // Exchange code for tokens
    const tokens = await getMicrosoftTokens(code)
    
    if (!tokens.access_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/book/${token}?error=token_exchange_failed`
      )
    }
    
    // Handle different OAuth flows with strict email separation
    let user
    
    if (type === 'account_management') {
      // ADDING CALENDAR TO EXISTING ACCOUNT
      user = await prisma.user.findFirst({
        orderBy: { updatedAt: 'desc' }
      })
      
      if (!user) {
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/account?error=no_session`
        )
      }
      
      // CRITICAL: Check if this email belongs to a different user
      const emailOwner = await prisma.user.findUnique({
        where: { email: email }
      })
      
      const existingToken = await prisma.calendarToken.findFirst({
        where: { 
          email: email,
          provider: 'microsoft'
        },
        include: { user: true }
      })
      
      if ((emailOwner && emailOwner.id !== user.id) || (existingToken && existingToken.userId !== user.id)) {
        // EMAIL CONFLICT - Block the connection
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/account?error=email_conflict&email=${encodeURIComponent(email)}&provider=microsoft`
        )
      }
      
      console.log(`🔗 Adding ${email} calendar to current user: ${user.email}`)
      
    } else {
      // LOGIN FLOW - Find or create user by OAuth email
      user = await prisma.user.findUnique({
        where: { email: email }
      })
      
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: email,
            name: name,
            plan: 'free'
          }
        })
      }
      
      console.log(`🔑 Login flow: Authenticating as ${email}`)
    }
    
    // Check if this exact email is already connected for this user
    const existingToken = await prisma.calendarToken.findFirst({
      where: {
        userId: user.id,
        provider: 'microsoft',
        email: email
      }
    })
    
    if (existingToken) {
      // Update existing token
      await prisma.calendarToken.update({
        where: { id: existingToken.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || undefined,
          expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
          accountName: name
        }
      })
    } else {
      // Create new token for this email
      const existingCount = await prisma.calendarToken.count({
        where: {
          userId: user.id,
          provider: 'microsoft'
        }
      })
      
      await prisma.calendarToken.create({
        data: {
          userId: user.id,
          provider: 'microsoft',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || undefined,
          expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : undefined,
          email: email,
          accountName: name,
          isPrimary: existingCount === 0 // First account is primary
        }
      })
    }
    
    // Handle different OAuth flows
    if (type === 'account_management') {
      // Account management - redirect back to account page
      const redirectPath = stateData.redirect || '/account'
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}${redirectPath}?calendar_connected=microsoft&email=${email}&name=${encodeURIComponent(name)}`
      )
    } else if (token) {
      // Update booking with recipient info
      await prisma.booking.update({
        where: { shareToken: token },
        data: {
          recipientEmail: email,
          recipientName: name,
          recipientId: user.id
        }
      })
      
      // Redirect back to booking page to fetch suggestions
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/book/${token}?connected=true`
      )
    } else {
      // Default redirect to dashboard
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?calendar_connected=microsoft&email=${email}&name=${encodeURIComponent(name)}`
      )
    }
  } catch (error) {
    console.error('Microsoft OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}?error=auth_error`
    )
  }
}