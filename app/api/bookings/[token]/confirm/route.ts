import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createGoogleCalendarEvent } from '@/lib/calendar/google'
import { createMicrosoftCalendarEvent } from '@/lib/calendar/microsoft'
import { sendEmail, getBookingConfirmationEmail } from '@/lib/email'
import { formatDateTime } from '@/lib/utils'
import { addMinutes } from 'date-fns'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await req.json()
    const { suggestionId, recipientName, recipientEmail } = body

    // Get booking and suggestion
    const booking = await prisma.booking.findUnique({
      where: {
        shareToken: token
      },
      include: {
        suggestions: true
      }
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    const suggestion = booking.suggestions.find(s => s.id === suggestionId)
    
    if (!suggestion) {
      return NextResponse.json(
        { error: 'Invalid suggestion' },
        { status: 400 }
      )
    }

    // Update booking with selected time
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        recipientName,
        recipientEmail,
        selectedTime: suggestion.startTime,
        status: 'confirmed'
      }
    })

    // Mark suggestion as selected
    await prisma.timeSuggestion.update({
      where: { id: suggestion.id },
      data: { selected: true }
    })

    // Get calendar tokens
    const creatorToken = await prisma.calendarToken.findFirst({
      where: { email: booking.creatorEmail }
    })

    const recipientToken = await prisma.calendarToken.findFirst({
      where: { email: recipientEmail }
    })

    // Create ONE shared calendar event 
    const eventData = {
      summary: booking.title,
      description: `Meeting confirmed through CalendarSync\n\n${booking.description || ''}`,
      start: suggestion.startTime,
      end: addMinutes(suggestion.startTime, booking.duration),
      attendees: [
        { email: recipientEmail } // Standard invitation
      ]
    }

    // Create event ONLY in creator's calendar (recipient gets automatic invitation)
    if (creatorToken) {
      try {
        if (creatorToken.provider === 'google') {
          const event = await createGoogleCalendarEvent(
            creatorToken.accessToken,
            eventData
          )
          await prisma.booking.update({
            where: { id: booking.id },
            data: { googleEventId: event.id }
          })
          console.log('Created shared Google Calendar event:', event.id)
        } else if (creatorToken.provider === 'microsoft') {
          const event = await createMicrosoftCalendarEvent(
            creatorToken.accessToken,
            eventData
          )
          await prisma.booking.update({
            where: { id: booking.id },
            data: { outlookEventId: event.id }
          })
          console.log('Created shared Microsoft Calendar event:', event.id)
        }
      } catch (error) {
        console.error('Error creating shared calendar event:', error)
      }
    } else {
      console.log('Creator has no calendar token - event creation skipped')
    }

    // Send confirmation emails
    const meetingTime = formatDateTime(suggestion.startTime)
    
    // Email to creator
    await sendEmail({
      to: booking.creatorEmail,
      subject: `Meeting Confirmed: ${booking.title}`,
      html: getBookingConfirmationEmail(
        booking.creatorName,
        booking.title,
        meetingTime,
        booking.duration.toString()
      )
    })

    // Email to recipient
    await sendEmail({
      to: recipientEmail,
      subject: `Meeting Confirmed: ${booking.title}`,
      html: getBookingConfirmationEmail(
        recipientName,
        booking.title,
        meetingTime,
        booking.duration.toString()
      )
    })

    // Track analytics
    await prisma.analytics.create({
      data: {
        event: 'booking_confirmed',
        bookingId: booking.id,
        metadata: JSON.stringify({
          duration: booking.duration,
          provider: recipientToken?.provider
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Meeting confirmed and added to calendars'
    })
  } catch (error) {
    console.error('Error confirming booking:', error)
    return NextResponse.json(
      { error: 'Failed to confirm booking' },
      { status: 500 }
    )
  }
}