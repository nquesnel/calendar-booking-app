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
    
    // Get all sessions for this user
    const userSessions = await prisma.userSession.findMany({
      where: { userId: sessionUser.id },
      orderBy: { lastActivity: 'desc' }
    })
    
    // Get current session token from request
    const currentToken = req.cookies.get('auth-token')?.value
    
    // Transform sessions for frontend
    const sessions = userSessions.map(session => {
      // Use stored device/browser info, fallback to parsing user agent
      const parsedUA = parseUserAgent(session.userAgent || '')
      
      return {
        id: session.id,
        isCurrent: session.sessionToken === currentToken,
        device: session.device || parsedUA.device,
        browser: session.browser || parsedUA.browser,
        location: session.location || 'Unknown Location',
        ipAddress: session.ipAddress || 'Unknown',
        loginTime: session.createdAt.toISOString(),
        lastActivity: session.lastActivity.toISOString(),
        loginMethod: session.loginMethod || 'google',
        isActive: session.isActive && session.expiresAt > new Date()
      }
    })
    
    return NextResponse.json({
      success: true,
      sessions
    })
    
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

function parseUserAgent(userAgent: string) {
  // Simple user agent parsing
  let device = 'Unknown Device'
  let browser = 'Unknown Browser'
  
  // Device detection
  if (userAgent.includes('iPhone')) device = 'iPhone'
  else if (userAgent.includes('iPad')) device = 'iPad'
  else if (userAgent.includes('Android')) device = 'Android Device'
  else if (userAgent.includes('Macintosh')) device = 'Mac'
  else if (userAgent.includes('Windows')) device = 'Windows PC'
  else if (userAgent.includes('Linux')) device = 'Linux'
  
  // Browser detection
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome'
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari'
  else if (userAgent.includes('Firefox')) browser = 'Firefox'
  else if (userAgent.includes('Edg')) browser = 'Microsoft Edge'
  
  return { device, browser }
}