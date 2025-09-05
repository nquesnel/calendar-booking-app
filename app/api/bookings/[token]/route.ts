import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendBulkEmails, getAddedToMeetingEmail, getBookingInviteEmail } from '@/lib/email'
import { formatDateTime } from '@/lib/utils'
import { updateGoogleCalendarEvent } from '@/lib/calendar/google'
import { addMinutes } from 'date-fns'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const booking = await prisma.booking.findUnique({
      where: {
        shareToken: token
      },
      include: {
        suggestions: true,
        participants: true
      }
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        creatorName: booking.creatorName,
        creatorEmail: booking.creatorEmail,
        recipientEmail: booking.recipientEmail,
        recipientName: booking.recipientName,
        title: booking.title,
        description: booking.description,
        duration: booking.duration,
        status: booking.status,
        selectedTime: booking.selectedTime,
        timeZone: booking.timeZone,
        meetingType: booking.meetingType,
        meetingLink: booking.meetingLink,
        phoneNumber: booking.phoneNumber,
        address: booking.address,
        meetingNotes: booking.meetingNotes,
        isGroupMeeting: booking.isGroupMeeting,
        maxParticipants: booking.maxParticipants,
        // Group meeting fields
        participantDeadline: booking.participantDeadline,
        autoSelectAtDeadline: booking.autoSelectAtDeadline,
        allParticipantsConnected: booking.allParticipantsConnected,
        readyForSelection: booking.readyForSelection
      },
      participants: booking.participants,
      suggestions: booking.suggestions
    })
  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
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
    
    const {
      title,
      description,
      duration,
      meetingType,
      meetingLink,
      phoneNumber,
      address,
      meetingNotes,
      invitees
    } = body
    
    // Validate required fields
    if (!title || !duration) {
      return NextResponse.json(
        { error: 'Title and duration are required' },
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
    
    // Determine new invitees (people who weren't previously invited)
    const previousInvitees = []
    if (existingBooking.recipientEmail) {
      previousInvitees.push(existingBooking.recipientEmail)
    }
    
    const newInvitees = invitees ? invitees.filter((email: string) => 
      !previousInvitees.includes(email) && email !== existingBooking.creatorEmail
    ) : []
    
    // Update the booking
    const updatedBooking = await prisma.booking.update({
      where: { shareToken: token },
      data: {
        title,
        description,
        duration,
        meetingType,
        meetingLink: meetingType === 'video' ? meetingLink : null,
        phoneNumber: meetingType === 'phone' ? phoneNumber : null,
        address: meetingType === 'in-person' ? address : null,
        meetingNotes,
        // Update recipient email if provided in invitees
        ...(invitees && invitees.length > 0 && {
          recipientEmail: invitees[0] // For now, we'll use the first invitee as the primary recipient
        })
      }
    })
    
    // Send email invitations to new invitees
    if (newInvitees.length > 0) {
      try {
        const emailPromises = newInvitees.map((email: string) => {
          const recipientName = email.split('@')[0] // Extract name from email if no name provided
          
          if (updatedBooking.selectedTime) {
            // Meeting is already scheduled - send "added to meeting" email
            return {
              to: email,
              subject: `You've been added to: ${updatedBooking.title}`,
              html: getAddedToMeetingEmail(
                recipientName,
                updatedBooking.creatorName,
                updatedBooking.title,
                formatDateTime(new Date(updatedBooking.selectedTime)),
                updatedBooking.duration.toString(),
                updatedBooking.meetingType,
                {
                  videoLink: updatedBooking.meetingLink,
                  phoneNumber: updatedBooking.phoneNumber,
                  address: updatedBooking.address,
                  notes: updatedBooking.meetingNotes
                }
              )
            }
          } else {
            // Meeting is pending - send booking invite email
            const shareLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/${token}`
            return {
              to: email,
              subject: `Meeting request from ${updatedBooking.creatorName}: ${updatedBooking.title}`,
              html: getBookingInviteEmail(
                recipientName,
                updatedBooking.creatorName,
                updatedBooking.title,
                shareLink
              )
            }
          }
        })
        
        const emailResults = await sendBulkEmails(emailPromises)
        console.log(`Sent ${updatedBooking.selectedTime ? 'meeting notifications' : 'booking invites'} to ${emailResults.successful}/${emailResults.total} new invitees`)
        
      } catch (emailError) {
        console.error('Error sending invitations to new invitees:', emailError)
        // Don't fail the update if email sending fails
      }
    }
    
    // Update Google Calendar event if it exists and booking has a scheduled time
    if (existingBooking.googleEventId && updatedBooking.selectedTime) {
      try {
        // Get creator's calendar token
        const creatorToken = await prisma.calendarToken.findFirst({
          where: { email: existingBooking.creatorEmail, provider: 'google' }
        })

        if (creatorToken) {
          const eventData = {
            summary: updatedBooking.title,
            description: updatedBooking.description || 'Meeting confirmed through CalendarSync',
            start: new Date(updatedBooking.selectedTime),
            end: addMinutes(new Date(updatedBooking.selectedTime), updatedBooking.duration),
            attendees: updatedBooking.recipientEmail ? [
              { email: updatedBooking.recipientEmail }
            ] : []
          }

          await updateGoogleCalendarEvent(
            creatorToken.accessToken,
            existingBooking.googleEventId,
            eventData
          )
          
          console.log('Updated Google Calendar event after meeting edit:', existingBooking.googleEventId)
        }
      } catch (error) {
        console.error('Error updating Google Calendar event:', error)
        // Don't fail the update if calendar sync fails
      }
    }
    
    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      ...(newInvitees.length > 0 && {
        emailsSent: newInvitees.length,
        message: `Meeting updated successfully. Invitations sent to ${newInvitees.length} new participant${newInvitees.length === 1 ? '' : 's'}.`
      })
    })
    
  } catch (error) {
    console.error('Error updating booking:', error)
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    // Find the existing booking
    const existingBooking = await prisma.booking.findUnique({
      where: { shareToken: token },
      include: {
        suggestions: true
      }
    })
    
    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }
    
    // Delete related suggestions first (if any)
    if (existingBooking.suggestions.length > 0) {
      await prisma.timeSuggestion.deleteMany({
        where: { bookingId: existingBooking.id }
      })
    }
    
    // Delete the booking
    await prisma.booking.delete({
      where: { shareToken: token }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Booking deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting booking:', error)
    return NextResponse.json(
      { error: 'Failed to delete booking' },
      { status: 500 }
    )
  }
}