import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthUrl } from '@/lib/calendar/google'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const token = searchParams.get('token')
  const email = searchParams.get('email')
  const name = searchParams.get('name')
  const providedState = searchParams.get('state')
  const redirect = searchParams.get('redirect')
  
  let state: string
  
  if (providedState) {
    // Use provided state (e.g., from account management)
    state = providedState
  } else if (token && email && name) {
    // Legacy recipient booking flow
    state = Buffer.from(JSON.stringify({
      token,
      email,
      name,
      provider: 'google',
      type: 'recipient'
    })).toString('base64')
  } else if (redirect) {
    // Determine if this is login flow vs account management
    // If redirect is to dashboard/account pages, it's likely login
    // If redirect is to account page specifically from account management, it's add calendar
    const isLoginFlow = redirect.includes('/dashboard') || redirect === '/dashboard'
    
    state = Buffer.from(JSON.stringify({
      provider: 'google',
      type: isLoginFlow ? 'login' : 'account_management',
      redirect: redirect
    })).toString('base64')
  } else {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  }
  
  const authUrl = getGoogleAuthUrl(state)
  
  console.log('Generated Google auth URL:', authUrl)
  
  return NextResponse.redirect(authUrl)
}