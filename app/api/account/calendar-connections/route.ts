import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    // Get user from session token
    const sessionUser = await getUserFromRequest(req)
    
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: { calendarTokens: true }
    })
    
    if (!user) {
      return NextResponse.json({
        success: true,
        connections: []
      })
    }
    
    console.log(`📊 Loading calendar connections for authenticated user: ${user.email} (${user.calendarTokens.length} tokens)`)
    const calendarTokens = user.calendarTokens
    
    const connections = calendarTokens.map(token => ({
      id: token.id,
      provider: token.provider,
      email: token.email,
      accountName: token.accountName,
      isPrimary: token.isPrimary,
      isAccountCalendar: token.isAccountCalendar,
      connectedAt: token.createdAt.toISOString(),
      status: token.expiresAt && token.expiresAt < new Date() ? 'expired' : 'active'
    }))
    
    return NextResponse.json({
      success: true,
      connections
    })
    
  } catch (error) {
    console.error('Error fetching calendar connections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar connections' },
      { status: 500 }
    )
  }
}