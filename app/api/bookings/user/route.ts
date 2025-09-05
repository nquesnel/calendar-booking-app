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
    
    // Get user's bookings where they are the creator
    const bookings = await prisma.booking.findMany({
      where: {
        creatorEmail: sessionUser.email
      },
      include: {
        participants: true,
        suggestions: true,
        coachingSession: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform bookings to match the dashboard interface
    const transformedBookings = bookings.map(booking => ({
      id: booking.id,
      title: booking.title,
      creatorName: booking.creatorName,
      creatorEmail: booking.creatorEmail,
      recipientName: booking.recipientName,
      recipientEmail: booking.recipientEmail,
      selectedTime: booking.selectedTime?.toISOString(),
      duration: booking.duration,
      status: booking.status,
      meetingType: booking.meetingType,
      isGroupMeeting: booking.isGroupMeeting,
      isRecurring: booking.isRecurring,
      participantCount: booking.participants.length + 1, // +1 for creator
      shareToken: booking.shareToken,
      createdAt: booking.createdAt.toISOString(),
      // Additional meeting details
      meetingLink: booking.meetingLink,
      phoneNumber: booking.phoneNumber,
      address: booking.address,
      meetingNotes: booking.meetingNotes
    }))

    // Calculate real stats
    const stats = {
      totalMeetings: bookings.length,
      confirmedMeetings: bookings.filter(b => b.status === 'confirmed').length,
      pendingMeetings: bookings.filter(b => b.status === 'pending').length,
      groupMeetings: bookings.filter(b => b.isGroupMeeting).length,
      recurringMeetings: bookings.filter(b => b.isRecurring).length
    }

    return NextResponse.json({
      bookings: transformedBookings,
      stats
    })
  } catch (error) {
    console.error('Error fetching user bookings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}