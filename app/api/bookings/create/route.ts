import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateShareToken } from '@/lib/utils'
import { sendEmail, getBookingInviteEmail, sendBulkEmails, getGroupMeetingInviteEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      creatorName, 
      creatorEmail, 
      meetingTitle, 
      meetingDescription, 
      duration,
      // Enhanced meeting location fields
      meetingType,
      meetingLink,
      phoneNumber,
      address,
      meetingNotes,
      // Group meeting fields
      isGroupMeeting,
      maxParticipants,
      participantEmails,
      // Recurring session fields
      isRecurring,
      recurringPattern,
      // Organizer scheduling preferences
      timeUrgency,
      roughTimeframe,
      timeOfDayPref,
      avoidDays,
      preferredDays,
      // Group deadline settings
      deadlineHours,
      autoSelectAtDeadline
    } = body

    // Generate unique share token
    const shareToken = generateShareToken()
    
    // Create booking in database with enhanced fields
    const booking = await prisma.booking.create({
      data: {
        creatorName,
        creatorEmail,
        title: meetingTitle,
        description: meetingDescription,
        duration: parseInt(duration),
        shareToken,
        status: 'pending',
        
        // Enhanced meeting location system
        meetingType: meetingType || 'video',
        meetingLink: meetingLink || null,
        phoneNumber: phoneNumber || null,
        address: address || null,
        meetingNotes: meetingNotes || null,
        
        // Group meeting support
        isGroupMeeting: isGroupMeeting || false,
        maxParticipants: parseInt(maxParticipants) || 2,
        
        // Recurring session support
        isRecurring: isRecurring || false,
        recurringPattern: (isRecurring && recurringPattern) ? recurringPattern : null,
        
        // Organizer scheduling preferences
        timeUrgency: timeUrgency || 'flexible',
        roughTimeframe: roughTimeframe || null,
        timeOfDayPref: timeOfDayPref || null,
        avoidDays: avoidDays || null,
        preferredDays: preferredDays || null,
        
        // Group meeting deadline settings
        ...(isGroupMeeting && {
          participantDeadline: new Date(Date.now() + (parseInt(deadlineHours) || 48) * 60 * 60 * 1000),
          autoSelectAtDeadline: autoSelectAtDeadline || false,
          deadlineHours: parseInt(deadlineHours) || 48,
          allParticipantsConnected: false
        }),
      }
    })

    // Create participant records and send invites if group meeting
    if (isGroupMeeting && participantEmails && Array.isArray(participantEmails)) {
      const validEmails = participantEmails.filter(email => 
        email && email.trim() && email.includes('@')
      )
      
      // Create participant records
      await Promise.all(
        validEmails.map(email => 
          prisma.bookingParticipant.create({
            data: {
              bookingId: booking.id,
              email: email.trim(),
              name: email.split('@')[0], // Default name from email
              status: 'pending',
              calendarConnected: false
            }
          })
        )
      )
      
      // Send group meeting invites to all participants
      const deadline = booking.participantDeadline
      const deadlineStr = deadline ? deadline.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric', 
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }) : 'Soon'
      
      const emailPromises = validEmails.map(email => {
        const recipientName = email.split('@')[0]
        return {
          to: email,
          subject: `👥 Group Meeting Invitation: ${booking.title}`,
          html: getGroupMeetingInviteEmail(
            recipientName,
            creatorName,
            booking.title,
            validEmails.length + 1, // +1 for organizer
            deadlineStr,
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/${shareToken}`
          )
        }
      })
      
      try {
        const emailResults = await sendBulkEmails(emailPromises)
        console.log(`📧 Sent group meeting invites to ${emailResults.successful}/${emailResults.total} participants`)
      } catch (error) {
        console.error('Error sending group meeting invites:', error)
        // Don't fail booking creation if email sending fails
      }
    }

    // Generate share link
    const shareLink = `${process.env.NEXT_PUBLIC_APP_URL}/book/${shareToken}`

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      shareLink,
      meetingType: booking.meetingType,
      isGroupMeeting: booking.isGroupMeeting,
      isRecurring: booking.isRecurring
    })
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    )
  }
}