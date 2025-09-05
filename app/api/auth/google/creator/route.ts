import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthUrl } from '@/lib/calendar/google'

export async function GET(req: NextRequest) {
  // Create state parameter for creator OAuth
  const state = Buffer.from(JSON.stringify({
    provider: 'google',
    type: 'creator'
  })).toString('base64')
  
  const authUrl = getGoogleAuthUrl(state)
  
  return NextResponse.redirect(authUrl)
}