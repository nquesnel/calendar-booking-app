import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    // Get current authenticated user
    const sessionUser = await getUserFromRequest(req)
    
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const { email, provider } = await req.json()
    
    if (!email || !provider) {
      return NextResponse.json(
        { error: 'Email and provider are required' },
        { status: 400 }
      )
    }
    
    // Check if this email belongs to a different user
    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    })
    
    // Check if this email is already connected to a different user via calendar tokens
    const existingToken = await prisma.calendarToken.findFirst({
      where: {
        email: email,
        provider: provider
      },
      include: {
        user: true
      }
    })
    
    if (existingToken && existingToken.userId !== sessionUser.id) {
      // Email belongs to different user - CONFLICT!
      return NextResponse.json({
        conflict: true,
        error: 'Email already registered',
        message: `${email} is already registered to a different account. To access this calendar, please sign out and log in with ${email} instead.`,
        conflictEmail: email,
        conflictProvider: provider,
        suggestions: [
          'Sign out of your current account',
          `Log in with ${email} to access that account`,
          'Or use a different ${provider} account for additional calendar access'
        ]
      }, { status: 409 }) // 409 = Conflict
    }
    
    if (existingUser && existingUser.id !== sessionUser.id) {
      // Email belongs to different user account
      return NextResponse.json({
        conflict: true,
        error: 'Email belongs to different account',
        message: `${email} is registered as a separate account. To access it, please sign out and log in with ${email}.`,
        conflictEmail: email,
        conflictProvider: provider,
        suggestions: [
          'Sign out of your current account',
          `Log in with ${email}`,
          'Or use a different email for additional calendar access'
        ]
      }, { status: 409 })
    }
    
    // No conflict - safe to proceed
    return NextResponse.json({
      conflict: false,
      message: 'Safe to connect calendar',
      canProceed: true
    })
    
  } catch (error) {
    console.error('Error checking email conflict:', error)
    return NextResponse.json(
      { error: 'Failed to check email conflict' },
      { status: 500 }
    )
  }
}