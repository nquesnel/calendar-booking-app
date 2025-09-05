import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmail, getOrganizerReadyToScheduleEmail } from '@/lib/email'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { participantEmail } = await req.json()

    // Get booking with participants
    const booking = await prisma.booking.findUnique({
      where: { shareToken: token },
      include: { participants: true }
    })

    if (!booking || !booking.isGroupMeeting) {
      return NextResponse.json(
        { error: 'Group booking not found' },
        { status: 404 }
      )
    }

    // Update participant status
    await prisma.bookingParticipant.updateMany({
      where: {
        bookingId: booking.id,
        email: participantEmail
      },
      data: {
        calendarConnected: true,
        connectedAt: new Date(),
        status: 'calendar_connected'
      }
    })

    // Check if all participants have now connected
    const updatedParticipants = await prisma.bookingParticipant.findMany({
      where: { bookingId: booking.id }
    })

    const allConnected = updatedParticipants.every(p => p.calendarConnected)
    const connectedCount = updatedParticipants.filter(p => p.calendarConnected).length
    const totalCount = updatedParticipants.length

    console.log(`📊 Group meeting ${token}: ${connectedCount}/${totalCount} participants connected`)

    // If all participants connected, mark booking as ready and notify organizer
    if (allConnected && !booking.allParticipantsConnected) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          allParticipantsConnected: true,
          readyForSelection: new Date()
        }
      })

      // Send notification to organizer
      try {
        const shareLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book/${token}`
        
        await sendEmail({
          to: booking.creatorEmail,
          subject: `🎯 Ready to Schedule: ${booking.title}`,
          html: getOrganizerReadyToScheduleEmail(
            booking.creatorName,
            booking.title,
            totalCount + 1, // +1 for organizer
            connectedCount + 1, // +1 for organizer
            shareLink,
            'All participants connected!'
          )
        })

        console.log(`📧 Sent "ready to schedule" notification to organizer: ${booking.creatorEmail}`)
      } catch (error) {
        console.error('Error sending organizer notification:', error)
      }
    }

    return NextResponse.json({
      success: true,
      groupStatus: {
        connectedCount: connectedCount + 1, // +1 for organizer (assumed connected)
        totalCount: totalCount + 1,
        allConnected,
        readyForScheduling: allConnected
      }
    })

  } catch (error) {
    console.error('Error updating participant connection:', error)
    return NextResponse.json(
      { error: 'Failed to update participant status' },
      { status: 500 }
    )
  }
}