import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    
    // Find user by username (public endpoint - no auth required)
    const user = await prisma.user.findUnique({
      where: { username: username },
      select: {
        id: true,
        name: true,
        email: true, // Needed for booking creation
        username: true,
        firstName: true,
        lastName: true,
        plan: true,
        // Don't expose sensitive data
        // password: false,
        // calendarTokens: false
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Default meeting types (in future, these could be customizable per user)
    const defaultMeetingTypes = [
      {
        id: '15min',
        name: '15-Minute Chat',
        duration: 15,
        description: 'Quick conversation or coffee chat',
        meetingType: 'video' as const
      },
      {
        id: '30min', 
        name: '30-Minute Meeting',
        duration: 30,
        description: 'Standard meeting or consultation', 
        meetingType: 'video' as const
      },
      {
        id: '60min',
        name: '1-Hour Session',
        duration: 60,
        description: 'In-depth discussion or strategy session',
        meetingType: 'video' as const
      }
    ]

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        plan: user.plan
      },
      meetingTypes: defaultMeetingTypes
    })

  } catch (error) {
    console.error('Error fetching public user profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}