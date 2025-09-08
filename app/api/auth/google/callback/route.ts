import { NextRequest, NextResponse } from 'next/server'
import { getGoogleTokens } from '@/lib/calendar/google'
import { prisma } from '@/lib/db'
import { google } from 'googleapis'
import { generateToken } from '@/lib/auth'

// Simple IP geolocation function
async function getLocationFromIP(ip: string): Promise<string> {
  try {
    // Using free ipapi.co service for geolocation
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (response.ok) {
      const data = await response.json()
      if (data.city && data.country_name) {
        return `${data.city}, ${data.country_name}`
      } else if (data.country_name) {
        return data.country_name
      }
    }
    
    return 'Unknown Location'
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('⏰ IP geolocation timed out')
    } else {
      console.error('Error fetching location from IP:', error)
    }
    return 'Unknown Location'
  }
}

// Enhanced user agent parsing
function parseUserAgent(userAgent: string): { device: string; browser: string } {
  let device = 'Unknown Device'
  let browser = 'Unknown Browser'
  
  // Device detection
  if (userAgent.includes('iPhone')) device = 'iPhone'
  else if (userAgent.includes('iPad')) device = 'iPad'  
  else if (userAgent.includes('Android')) device = 'Android Device'
  else if (userAgent.includes('Macintosh')) device = 'Mac'
  else if (userAgent.includes('Windows NT 10')) device = 'Windows 10'
  else if (userAgent.includes('Windows NT')) device = 'Windows PC'
  else if (userAgent.includes('Linux')) device = 'Linux'
  else if (userAgent.includes('CrOS')) device = 'Chromebook'
  
  // Browser detection (order matters - Chrome includes Safari in UA)
  if (userAgent.includes('Edg/')) browser = 'Microsoft Edge'
  else if (userAgent.includes('Chrome/') && !userAgent.includes('Edg')) browser = 'Chrome'
  else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) browser = 'Safari'
  else if (userAgent.includes('Firefox/')) browser = 'Firefox'
  else if (userAgent.includes('Opera/') || userAgent.includes('OPR/')) browser = 'Opera'
  
  return { device, browser }
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXT_PUBLIC_APP_URL + '/api/auth/google/callback'
)

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
    const { token, provider, type } = stateData
    
    // Exchange code for tokens
    const tokens = await getGoogleTokens(code)
    
    console.log('OAuth tokens received:', {
      access_token: tokens.access_token ? 'present' : 'missing',
      refresh_token: tokens.refresh_token ? 'present' : 'missing',
      scope: tokens.scope,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date
    })
    
    if (!tokens.access_token) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?error=token_exchange_failed`
      )
    }
    
    // Get user info from Google
    let userEmail: string
    let userName: string
    
    try {
      oauth2Client.setCredentials({ access_token: tokens.access_token })
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
      const userInfo = await oauth2.userinfo.get()
      
      console.log('Google user info:', userInfo.data)
      
      userEmail = userInfo.data.email!
      
      // Try to get full name, fallback to display name, then email prefix
      userName = userInfo.data.name || userEmail.split('@')[0]
      
      // If we have both given and family name, use full name
      if (userInfo.data.given_name && userInfo.data.family_name) {
        userName = `${userInfo.data.given_name} ${userInfo.data.family_name}`
      } else if (userInfo.data.given_name) {
        userName = userInfo.data.given_name
      }
      
      console.log(`📝 Display name for ${userEmail}: "${userName}"`)
      
      if (!userEmail) {
        throw new Error('No email returned from Google')
      }
    } catch (error) {
      console.error('Error fetching user info:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}?error=auth_error`
      )
    }
    
    // Handle different OAuth flows with strict email separation
    let user
    
    if (type === 'account_management') {
      // ADDING CALENDAR TO EXISTING ACCOUNT
      // Get the specific user ID from the state (passed from frontend)
      const currentUserId = stateData.currentUserId
      
      if (!currentUserId) {
        console.log('⚠️ No currentUserId in state - security risk, blocking operation')
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/account?error=invalid_session`
        )
      }
      
      user = await prisma.user.findUnique({
        where: { id: currentUserId }
      })
      
      if (!user) {
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/account?error=user_not_found`
        )
      }
      
      console.log(`🎯 Adding calendar to specific user: ${user.email} (ID: ${currentUserId})`)
      
      if (!user) {
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/account?error=no_session`
        )
      }
      
      // CRITICAL: Check if this email belongs to a different user
      const emailOwner = await prisma.user.findUnique({
        where: { email: userEmail }
      })
      
      const existingToken = await prisma.calendarToken.findFirst({
        where: { 
          email: userEmail,
          provider: 'google'
        },
        include: { user: true }
      })
      
      if ((emailOwner && emailOwner.id !== user.id) || (existingToken && existingToken.userId !== user.id)) {
        // EMAIL CONFLICT - Block the connection but preserve current session
        console.log(`⚠️ Email conflict detected: ${userEmail} belongs to different user`)
        
        // Create session token for the CORRECT user (not the conflicting email's user)
        const sessionToken = generateToken({
          id: user.id,
          email: user.email,
          name: user.name,
          plan: user.plan
        })
        
        console.log(`⚠️ Preserving session for correct user: ${user.email} (blocking ${userEmail})`)
        
        const response = NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/account?error=email_conflict&email=${encodeURIComponent(userEmail)}&provider=google`
        )
        
        // CRITICAL: Preserve the current user's session (not the conflicting email's user)
        response.cookies.set('auth-token', sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 // 7 days
        })
        
        return response
      }
      
      console.log(`🔗 Adding ${userEmail} calendar to current user: ${user.email}`)
      
    } else if (type === 'login' || type === 'creator' || type === 'recipient' || !type) {
      // LOGIN/RECIPIENT FLOW - Find or create user by OAuth email
      console.log(`🔑 Processing ${type || 'login'} flow for ${userEmail}`)
      
      user = await prisma.user.findUnique({
        where: { email: userEmail }
      })
      
      if (!user) {
        console.log(`🆕 Creating new user: ${userEmail}`)
        user = await prisma.user.create({
          data: {
            email: userEmail,
            name: userName,
            plan: 'super_admin' // New users start as super admin for testing
          }
        })
      } else {
        console.log(`✅ Found existing user: ${userEmail}`)
      }
      
      console.log(`🔑 ${type || 'login'} flow: Authenticating as ${userEmail}`)
    } else {
      // Unknown flow type
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=unknown_flow`
      )
    }
    
    // Check if this exact email is already connected for this user
    const existingToken = await prisma.calendarToken.findFirst({
      where: {
        userId: user.id,
        provider: 'google',
        email: userEmail
      }
    })
    
    // Determine if this is the account calendar (login identity) vs additional calendar
    // Only mark as account calendar if this is the user's primary email AND it's a login flow
    const isAccountCalendar = (userEmail === user.email && type !== 'account_management')
    
    if (existingToken) {
      // Update existing token
      await prisma.calendarToken.update({
        where: { id: existingToken.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || undefined,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          accountName: userName,
          isAccountCalendar: isAccountCalendar
        }
      })
    } else {
      // Create new token for this email
      const existingCount = await prisma.calendarToken.count({
        where: {
          userId: user.id,
          provider: 'google'
        }
      })
      
      await prisma.calendarToken.create({
        data: {
          userId: user.id,
          provider: 'google',
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || undefined,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          email: userEmail,
          accountName: userName,
          isPrimary: existingCount === 0, // First account is primary
          isAccountCalendar: isAccountCalendar // TRUE if this matches the user's login email
        }
      })
      
      console.log(`📅 Created ${isAccountCalendar ? 'Account Calendar' : 'Additional Calendar'} for ${userEmail}`)
    }
    
    // Create session token for the authenticated user
    const sessionToken = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan
    })
    
    // Get client info for session tracking
    const rawIP = req.headers.get('x-forwarded-for') || 
                 req.headers.get('x-real-ip') || 
                 req.headers.get('cf-connecting-ip') || // Cloudflare
                 req.ip || 
                 'unknown'
    
    // Clean up IP (remove port, get first IP if multiple)
    const ipAddress = rawIP.split(',')[0].trim().replace(/^::ffff:/, '') || 'unknown'
    const userAgent = req.headers.get('user-agent') || ''
    
    // Get location from IP (for localhost, show dev info)
    let location = 'Unknown Location'
    if (ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress.startsWith('192.168') || ipAddress.startsWith('10.')) {
      location = 'Local Development'
    } else {
      // In production, you'd call an IP geolocation service here
      location = await getLocationFromIP(ipAddress)
    }
    
    // Parse user agent for better device/browser info
    const deviceInfo = parseUserAgent(userAgent)
    
    console.log(`📍 Session tracking: IP=${ipAddress}, Location=${location}, Device=${deviceInfo.device}, Browser=${deviceInfo.browser}`)
    
    // Create session record in database
    try {
      await prisma.userSession.create({
        data: {
          userId: user.id,
          sessionToken: sessionToken,
          ipAddress: ipAddress,
          userAgent: userAgent,
          device: deviceInfo.device,
          browser: deviceInfo.browser,
          location: location,
          loginMethod: 'google',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          isActive: true
        }
      })
      
      console.log(`📝 Session created for ${user.email} from IP: ${ipAddress}`)
    } catch (error) {
      console.error('Error creating session record:', error)
      // Don't fail login if session tracking fails
    }
    
    // Handle different OAuth flows
    if (type === 'creator') {
      // Creator connecting their calendar during booking creation
      const response = NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/create?creator_connected=google&email=${userEmail}&name=${encodeURIComponent(userName)}`
      )
      response.cookies.set('auth-token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      })
      return response
      
    } else if (type === 'account_management') {
      // Account management - adding calendar to existing account
      const redirectPath = stateData.redirect || '/account'
      const response = NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}${redirectPath}?calendar_connected=google&email=${userEmail}&name=${encodeURIComponent(userName)}`
      )
      response.cookies.set('auth-token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      })
      return response
      
    } else if (type === 'login') {
      // Pure login flow - authenticate and redirect to dashboard
      const redirectPath = stateData.redirect || '/dashboard'
      const response = NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}${redirectPath}`
      )
      response.cookies.set('auth-token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      })
      return response
      
    } else if (token) {
      // Recipient connecting their calendar for existing booking
      await prisma.booking.update({
        where: { shareToken: token },
        data: {
          recipientEmail: userEmail,
          recipientName: userName,
          recipientId: user.id
        }
      })
      
      // Redirect back to booking page to fetch suggestions
      const response = NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/book/${token}?connected=true&email=${userEmail}&name=${encodeURIComponent(userName)}`
      )
      response.cookies.set('auth-token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      })
      return response
      
    } else {
      // Default redirect to dashboard
      const response = NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
      )
      response.cookies.set('auth-token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      })
      return response
    }
  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}?error=auth_error`
    )
  }
}