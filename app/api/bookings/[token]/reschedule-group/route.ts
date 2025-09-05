import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getGoogleCalendarEvents } from '@/lib/calendar/google'
import { getMicrosoftCalendarEvents } from '@/lib/calendar/microsoft'
import { getSuggestedTimesWithPreferences } from '@/lib/calendar/enhanced-scheduler'
import { addDays, addHours } from 'date-fns'
import { hasAccess } from '@/lib/tiers'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await req.json()
    const { requesterId, message } = body

    // Get booking
    const booking = await prisma.booking.findUnique({
      where: { shareToken: token },
      include: { 
        participants: true,
        creator: { include: { calendarTokens: true } }
      }
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check if user has access to group rescheduling
    if (booking.creator) {
      const canRescheduleGroup = hasAccess(booking.creator.plan as any, 'groupRescheduling')
      if (!canRescheduleGroup) {
        return NextResponse.json(
          { error: 'Group rescheduling requires Coaching plan' },
          { status: 403 }
        )
      }
    }

    // Only group meetings can be rescheduled with this endpoint
    if (!booking.isGroupMeeting) {
      return NextResponse.json(
        { error: 'This is not a group meeting' },
        { status: 400 }
      )
    }

    // Get all participant emails
    const participantEmails = [
      booking.creatorEmail,
      ...booking.participants.map(p => p.email)
    ].filter(Boolean)

    console.log(`Group reschedule requested for ${participantEmails.length} participants:`, participantEmails)

    // Collect calendar data from all participants
    const participantCalendarData: Record<string, any[]> = {}

    const timeMin = new Date()
    const timeMax = addDays(new Date(), 7)

    for (const email of participantEmails) {
      try {
        const calendarToken = await prisma.calendarToken.findFirst({
          where: { email }
        })

        if (calendarToken) {
          let events = []
          if (calendarToken.provider === 'google') {
            events = await getGoogleCalendarEvents(
              calendarToken.accessToken,
              timeMin,
              timeMax
            )
          } else if (calendarToken.provider === 'microsoft') {
            events = await getMicrosoftCalendarEvents(
              calendarToken.accessToken,
              timeMin,
              timeMax
            )
          }
          
          participantCalendarData[email] = events.map((e: any) => ({
            start: new Date(e.start?.dateTime || e.start?.date),
            end: new Date(e.end?.dateTime || e.end?.date)
          }))
        } else {
          participantCalendarData[email] = []
        }
      } catch (error) {
        console.error(`Error fetching calendar for ${email}:`, error)
        participantCalendarData[email] = []
      }
    }

    // Find optimal times using enhanced scheduler with preferences
    const recipientEmails = participantEmails.filter(email => email !== booking.creatorEmail)
    const creatorBusySlots = participantCalendarData[booking.creatorEmail] || []
    const recipientBusySlots: Record<string, any[]> = {}
    
    recipientEmails.forEach(email => {
      recipientBusySlots[email] = participantCalendarData[email] || []
    })

    const suggestions = await getSuggestedTimesWithPreferences(
      booking.creatorEmail,
      recipientEmails,
      creatorBusySlots,
      recipientBusySlots,
      booking.duration,
      booking.timeZone
    )

    // Create group reschedule request
    const rescheduleRequest = await prisma.groupRescheduleRequest.create({
      data: {
        originalBookingId: booking.id,
        requesterId,
        suggestedTimes: JSON.stringify(suggestions.slice(0, 3)), // Top 3 options
        autoConfirmAt: addHours(new Date(), 24), // 24-hour window
        status: 'pending',
        participantVotes: JSON.stringify({}) // Initialize empty votes
      }
    })

    // TODO: Send notifications to all participants
    console.log(`Created group reschedule request ${rescheduleRequest.id} with 3 options`)

    return NextResponse.json({
      success: true,
      rescheduleId: rescheduleRequest.id,
      suggestedTimes: suggestions.slice(0, 3),
      participantCount: participantEmails.length,
      autoConfirmAt: rescheduleRequest.autoConfirmAt,
      message: `Found ${suggestions.length} optimal times that work for all ${participantEmails.length} participants`
    })
  } catch (error) {
    console.error('Error creating group reschedule request:', error)
    return NextResponse.json(
      { error: 'Failed to create group reschedule request' },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Get active reschedule requests for this booking
    const booking = await prisma.booking.findUnique({
      where: { shareToken: token },
      include: { participants: true }
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    const rescheduleRequests = await prisma.groupRescheduleRequest.findMany({
      where: {
        originalBookingId: booking.id,
        status: 'pending'
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      rescheduleRequests: rescheduleRequests.map(req => ({
        ...req,
        suggestedTimes: JSON.parse(req.suggestedTimes),
        participantVotes: JSON.parse(req.participantVotes || '{}')
      }))
    })
  } catch (error) {
    console.error('Error fetching reschedule requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reschedule requests' },
      { status: 500 }
    )
  }
}