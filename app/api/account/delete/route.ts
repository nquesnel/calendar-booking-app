import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(req: NextRequest) {
  try {
    // In a real app, you'd get the user email from session/JWT
    const DEMO_USER_EMAIL = 'neal@whatarmy.com'
    
    const user = await prisma.user.findUnique({
      where: { email: DEMO_USER_EMAIL }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Delete in correct order to handle foreign key constraints
    
    // 1. Delete time suggestions for user's bookings
    await prisma.timeSuggestion.deleteMany({
      where: {
        booking: {
          creatorEmail: DEMO_USER_EMAIL
        }
      }
    })
    
    // 2. Delete user's bookings
    await prisma.booking.deleteMany({
      where: { creatorEmail: DEMO_USER_EMAIL }
    })
    
    // 3. Delete calendar tokens
    await prisma.calendarToken.deleteMany({
      where: { email: DEMO_USER_EMAIL }
    })
    
    // 4. Delete user preferences
    await prisma.userPreference.deleteMany({
      where: { userId: user.id }
    })
    
    // 5. Finally delete the user
    await prisma.user.delete({
      where: { id: user.id }
    })
    
    const response = NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    })
    
    // Clear any session cookies
    response.cookies.delete('session')
    response.cookies.delete('auth-token')
    
    return response
    
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}