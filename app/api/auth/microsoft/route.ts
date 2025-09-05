import { NextRequest, NextResponse } from 'next/server'
import { getMicrosoftAuthUrl } from '@/lib/calendar/microsoft'

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
      provider: 'microsoft'
    })).toString('base64')
  } else if (redirect) {
    // Account management flow
    state = Buffer.from(JSON.stringify({
      provider: 'microsoft',
      type: 'account_management',
      redirect: redirect
    })).toString('base64')
  } else {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  }
  
  const authUrl = getMicrosoftAuthUrl(state)
  
  console.log('Generated Microsoft auth URL:', authUrl)
  
  return NextResponse.redirect(authUrl)
}