import { NextRequest, NextResponse } from 'next/server'
import { getMicrosoftAuthUrl } from '@/lib/calendar/microsoft'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const email = searchParams.get('email')
  const name = searchParams.get('name')
  
  if (!email || !name) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  }
  
  // Create state parameter for creator OAuth
  const state = Buffer.from(JSON.stringify({
    email,
    name,
    provider: 'microsoft',
    type: 'creator'
  })).toString('base64')
  
  const authUrl = getMicrosoftAuthUrl(state)
  
  return NextResponse.redirect(authUrl)
}