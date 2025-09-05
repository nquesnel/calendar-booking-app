import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Signed out of all devices',
      redirect: '/?logged_out=true'
    })
    
    // Clear auth token cookie
    response.cookies.delete('auth-token')
    response.cookies.delete('session')
    response.cookies.delete('user-session')
    
    // Set cache headers to prevent back button issues
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    
    console.log('🚀 Sign out all devices: Cleared session cookies')
    
    return response
    
  } catch (error) {
    console.error('Error signing out all devices:', error)
    return NextResponse.json(
      { error: 'Failed to sign out of all devices' },
      { status: 500 }
    )
  }
}