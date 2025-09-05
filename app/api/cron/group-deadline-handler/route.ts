import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmail, getOrganizerReadyToScheduleEmail, getDeadlineReminderEmail } from '@/lib/email'
import { getSmartSuggestions } from '@/lib/calendar/smart-scheduler'
import { getGoogleCalendarEvents } from '@/lib/calendar/google'
import { getMicrosoftCalendarEvents } from '@/lib/calendar/microsoft'
import { addDays } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    console.log('🕒 Running group meeting deadline handler...')
    
    const now = new Date()
    
    // Find group meetings with upcoming deadlines
    const groupMeetings = await prisma.booking.findMany({
      where: {
        isGroupMeeting: true,
        status: 'pending',
        participantDeadline: {
          lte: addDays(now, 1) // Within next 24 hours
        },
        allParticipantsConnected: false
      },
      include: {
        participants: true
      }
    })
    
    console.log(`📊 Found ${groupMeetings.length} group meetings approaching deadline`)
    
    for (const booking of groupMeetings) {
      const deadlineTime = new Date(booking.participantDeadline!)
      const hoursUntilDeadline = Math.ceil((deadlineTime.getTime() - now.getTime()) / (1000 * 60 * 60))
      
      console.log(`⏰ Processing meeting "${booking.title}" - ${hoursUntilDeadline}h until deadline`)
      
      if (hoursUntilDeadline <= 0) {
        // DEADLINE HAS PASSED
        await handleExpiredDeadline(booking)
      } else if (hoursUntilDeadline <= 24) {
        // SEND 24-HOUR REMINDERS
        await sendDeadlineReminders(booking, hoursUntilDeadline)
      }
    }
    
    // Also check for meetings where all participants connected (send organizer notification)
    const readyMeetings = await prisma.booking.findMany({
      where: {
        isGroupMeeting: true,
        status: 'pending',
        allParticipantsConnected: true,
        readyForSelection: null // Haven't notified organizer yet
      },
      include: {
        participants: true
      }
    })
    
    for (const booking of readyMeetings) {
      await notifyOrganizerReady(booking)
    }
    
    return NextResponse.json({
      success: true,
      processed: groupMeetings.length + readyMeetings.length,
      expired: groupMeetings.filter(m => new Date(m.participantDeadline!) <= now).length,
      reminders: groupMeetings.filter(m => {
        const hours = Math.ceil((new Date(m.participantDeadline!).getTime() - now.getTime()) / (1000 * 60 * 60))
        return hours > 0 && hours <= 24
      }).length
    })
    
  } catch (error) {
    console.error('Error in deadline handler:', error)
    return NextResponse.json(
      { error: 'Failed to process deadlines' },
      { status: 500 }
    )
  }
}

async function handleExpiredDeadline(booking: any) {
  console.log(`⚠️ Deadline expired for "${booking.title}" - handling based on autoSelect: ${booking.autoSelectAtDeadline}`)
  
  if (booking.autoSelectAtDeadline) {
    // AUTO-SELECT TIME
    await autoSelectOptimalTime(booking)
  } else {
    // NOTIFY ORGANIZER TO CHOOSE
    await notifyOrganizerDeadlineExpired(booking)
  }
  
  // Update participants who missed deadline
  await prisma.bookingParticipant.updateMany({
    where: {
      bookingId: booking.id,
      calendarConnected: false
    },
    data: {
      status: 'missed_deadline'
    }
  })
}

async function autoSelectOptimalTime(booking: any) {
  try {
    console.log(`🤖 Auto-selecting optimal time for "${booking.title}"`)
    
    // Get connected participants
    const connectedParticipants = await prisma.bookingParticipant.findMany({
      where: {
        bookingId: booking.id,
        calendarConnected: true
      }
    })
    
    // Fetch all calendar data and run AI analysis
    // (This would use the same logic as the suggestions endpoint)
    
    // For now, simulate auto-selection
    const autoSelectedTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next week
    
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        selectedTime: autoSelectedTime,
        status: 'confirmed'
      }
    })
    
    // Send calendar invites to all participants (even those who missed deadline)
    // TODO: Implement calendar invite sending
    
    console.log(`✅ Auto-selected time for "${booking.title}": ${autoSelectedTime}`)
    
  } catch (error) {
    console.error('Error auto-selecting time:', error)
  }
}

async function notifyOrganizerDeadlineExpired(booking: any) {
  try {
    const connectedCount = await prisma.bookingParticipant.count({
      where: {
        bookingId: booking.id,
        calendarConnected: true
      }
    })
    
    const shareLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/${booking.shareToken}`
    
    await sendEmail({
      to: booking.creatorEmail,
      subject: `⏰ Time to Schedule: ${booking.title} (Deadline Reached)`,
      html: getOrganizerReadyToScheduleEmail(
        booking.creatorName,
        booking.title,
        booking.participants.length + 1,
        connectedCount + 1, // +1 for organizer
        shareLink,
        'Deadline reached - proceeding with available calendars'
      )
    })
    
    console.log(`📧 Sent deadline expired notification to organizer: ${booking.creatorEmail}`)
    
  } catch (error) {
    console.error('Error notifying organizer of deadline:', error)
  }
}

async function sendDeadlineReminders(booking: any, hoursLeft: number) {
  try {
    const unconnectedParticipants = await prisma.bookingParticipant.findMany({
      where: {
        bookingId: booking.id,
        calendarConnected: false,
        remindersSent: { lt: 2 } // Don't spam - max 2 reminders
      }
    })
    
    const shareLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/${booking.shareToken}`
    
    for (const participant of unconnectedParticipants) {
      await sendEmail({
        to: participant.email,
        subject: `⏰ ${hoursLeft}h Left: Connect Calendar for ${booking.title}`,
        html: getDeadlineReminderEmail(
          participant.name,
          booking.creatorName,
          booking.title,
          hoursLeft,
          shareLink
        )
      })
      
      // Track reminder sent
      await prisma.bookingParticipant.update({
        where: { id: participant.id },
        data: { remindersSent: { increment: 1 } }
      })
    }
    
    console.log(`📧 Sent deadline reminders to ${unconnectedParticipants.length} participants`)
    
  } catch (error) {
    console.error('Error sending deadline reminders:', error)
  }
}

async function notifyOrganizerReady(booking: any) {
  try {
    const shareLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/${booking.shareToken}`
    
    await sendEmail({
      to: booking.creatorEmail,
      subject: `🎯 Ready to Schedule: ${booking.title}`,
      html: getOrganizerReadyToScheduleEmail(
        booking.creatorName,
        booking.title,
        booking.participants.length + 1,
        booking.participants.length + 1, // All connected
        shareLink
      )
    })
    
    // Mark as notified
    await prisma.booking.update({
      where: { id: booking.id },
      data: { readyForSelection: new Date() }
    })
    
    console.log(`📧 Sent "ready to schedule" notification to organizer: ${booking.creatorEmail}`)
    
  } catch (error) {
    console.error('Error notifying organizer ready:', error)
  }
}