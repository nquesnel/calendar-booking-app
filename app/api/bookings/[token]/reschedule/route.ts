import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getGoogleCalendarEvents, updateGoogleCalendarEvent } from '@/lib/calendar/google'
import { getMicrosoftCalendarEvents } from '@/lib/calendar/microsoft'
import { getSuggestedTimesWithPreferences } from '@/lib/calendar/enhanced-scheduler'
import { addDays, addMinutes } from 'date-fns'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

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

    // Get all participant calendar tokens
    const allEmails = [
      booking.creatorEmail,
      booking.recipientEmail,
      ...booking.participants.map(p => p.email)
    ].filter((email): email is string => Boolean(email))

    console.log(`Smart rescheduling for ${allEmails.length} participants:`, allEmails)

    // Collect fresh calendar data from all participants
    const participantCalendarData: Record<string, any[]> = {}
    const timeMin = new Date()
    const timeMax = addDays(new Date(), 14) // Look 2 weeks ahead for rescheduling

    for (const email of allEmails) {
      try {
        const calendarToken = await prisma.calendarToken.findFirst({
          where: { email: email }
        })

        if (calendarToken) {
          let events = []
          if (calendarToken.provider === 'google') {
            events = await getGoogleCalendarEvents(
              calendarToken.accessToken,
              timeMin,
              timeMax,
              calendarToken // Pass full token object for refresh capability
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

    // Use enhanced scheduler to find new optimal times
    const recipientEmails = allEmails.filter(email => email !== booking.creatorEmail)
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

    console.log(`Smart reschedule found ${suggestions.length} optimal alternatives:`, suggestions)

    // Return the top 3 options with intelligent explanations
    const topOptions = suggestions.slice(0, 3).map((suggestion, index) => ({
      ...suggestion,
      rank: index + 1,
      description: index === 0 ? 'Best mutual availability' : 
                  index === 1 ? 'Great alternative option' : 
                  'Good backup choice',
      confidence: Math.round(suggestion.score * 100)
    }))

    return NextResponse.json({
      success: true,
      message: `Found ${topOptions.length} optimal rescheduling options based on current calendar availability`,
      originalTime: booking.selectedTime,
      suggestedTimes: topOptions,
      participantCount: allEmails.length,
      analysisDetails: {
        creatorBusySlots: creatorBusySlots.length,
        recipientBusySlots: Object.values(recipientBusySlots).flat().length,
        totalCalendarsAnalyzed: allEmails.length
      }
    })
  } catch (error) {
    console.error('Error generating reschedule suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to generate reschedule suggestions' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await req.json()
    const { newTime, endTime } = body

    if (!newTime) {
      return NextResponse.json(
        { error: 'New time is required' },
        { status: 400 }
      )
    }

    // Find the existing booking
    const existingBooking = await prisma.booking.findUnique({
      where: { shareToken: token }
    })

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Update the booking with the new time
    const updatedBooking = await prisma.booking.update({
      where: { shareToken: token },
      data: {
        selectedTime: new Date(newTime),
        status: 'confirmed' // Mark as confirmed since organizer selected the new time
      }
    })

    // Update the Google Calendar event if it exists
    if (existingBooking.googleEventId) {
      try {
        // Get creator's calendar token
        const creatorToken = await prisma.calendarToken.findFirst({
          where: { email: existingBooking.creatorEmail, provider: 'google' }
        })

        if (creatorToken) {
          const eventData = {
            summary: existingBooking.title,
            description: existingBooking.description || 'Meeting confirmed through CalendarSync',
            start: new Date(newTime),
            end: endTime ? new Date(endTime) : addMinutes(new Date(newTime), existingBooking.duration),
            attendees: existingBooking.recipientEmail ? [
              { email: existingBooking.recipientEmail }
            ] : []
          }

          await updateGoogleCalendarEvent(
            creatorToken.accessToken,
            existingBooking.googleEventId,
            eventData
          )
          
          console.log('Updated Google Calendar event:', existingBooking.googleEventId)
        }
      } catch (error) {
        console.error('Error updating Google Calendar event:', error)
        // Don't fail the reschedule if calendar update fails
      }
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      message: 'Meeting rescheduled successfully'
    })

  } catch (error) {
    console.error('Error rescheduling meeting:', error)
    return NextResponse.json(
      { error: 'Failed to reschedule meeting' },
      { status: 500 }
    )
  }
}