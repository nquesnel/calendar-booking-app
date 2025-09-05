import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isBefore, addMinutes } from 'date-fns'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { participantEmail, selectedTimeIndex, objection } = body

    // Get reschedule request
    const rescheduleRequest = await prisma.groupRescheduleRequest.findUnique({
      where: { id },
      include: {
        originalBooking: {
          include: { participants: true }
        }
      }
    })

    if (!rescheduleRequest) {
      return NextResponse.json(
        { error: 'Reschedule request not found' },
        { status: 404 }
      )
    }

    if (rescheduleRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Voting is closed for this reschedule request' },
        { status: 400 }
      )
    }

    // Check if voting deadline has passed
    if (isBefore(rescheduleRequest.autoConfirmAt, new Date())) {
      return NextResponse.json(
        { error: 'Voting deadline has passed' },
        { status: 400 }
      )
    }

    // Validate participant
    const allParticipants = [
      rescheduleRequest.originalBooking.creatorEmail,
      ...rescheduleRequest.originalBooking.participants.map(p => p.email)
    ]

    if (!allParticipants.includes(participantEmail)) {
      return NextResponse.json(
        { error: 'You are not a participant in this meeting' },
        { status: 403 }
      )
    }

    // Update participant votes
    const currentVotes = JSON.parse(rescheduleRequest.participantVotes || '{}')
    
    if (objection) {
      currentVotes[participantEmail] = { objection: true, message: objection }
    } else {
      currentVotes[participantEmail] = { 
        selectedTimeIndex, 
        timestamp: new Date().toISOString() 
      }
    }

    await prisma.groupRescheduleRequest.update({
      where: { id },
      data: { participantVotes: JSON.stringify(currentVotes) }
    })

    // Check if we have enough votes or objections to make a decision
    const voteCount = Object.keys(currentVotes).length
    const totalParticipants = allParticipants.length
    const objections = Object.values(currentVotes).filter((vote: any) => vote.objection)

    let shouldAutoConfirm = false
    let selectedOption = null

    if (objections.length > 0) {
      // If there are objections, mark as needs manual resolution
      await prisma.groupRescheduleRequest.update({
        where: { id },
        data: { status: 'objections' }
      })
    } else if (voteCount === totalParticipants) {
      // Everyone voted, find the most popular option
      const suggestedTimes = JSON.parse(rescheduleRequest.suggestedTimes)
      const voteCounts: Record<number, number> = {}
      
      Object.values(currentVotes).forEach((vote: any) => {
        if (typeof vote.selectedTimeIndex === 'number') {
          voteCounts[vote.selectedTimeIndex] = (voteCounts[vote.selectedTimeIndex] || 0) + 1
        }
      })

      // Find the option with the most votes
      const topOption = Object.entries(voteCounts).reduce((a, b) => 
        voteCounts[parseInt(a[0])] > voteCounts[parseInt(b[0])] ? a : b
      )
      
      selectedOption = parseInt(topOption[0])
      shouldAutoConfirm = true
    }

    if (shouldAutoConfirm && selectedOption !== null) {
      // Auto-confirm the winning option
      const suggestedTimes = JSON.parse(rescheduleRequest.suggestedTimes)
      const selectedTime = suggestedTimes[selectedOption]

      // Update original booking
      await prisma.booking.update({
        where: { id: rescheduleRequest.originalBookingId },
        data: {
          selectedTime: new Date(selectedTime.start),
          status: 'confirmed'
        }
      })

      // Mark reschedule request as confirmed
      await prisma.groupRescheduleRequest.update({
        where: { id },
        data: { status: 'confirmed' }
      })

      console.log(`Group reschedule auto-confirmed for option ${selectedOption}`)
    }

    return NextResponse.json({
      success: true,
      voteCount,
      totalParticipants,
      objectionCount: objections.length,
      status: objections.length > 0 ? 'objections' : 
              shouldAutoConfirm ? 'confirmed' : 'pending',
      selectedOption: shouldAutoConfirm ? selectedOption : null
    })
  } catch (error) {
    console.error('Error submitting vote:', error)
    return NextResponse.json(
      { error: 'Failed to submit vote' },
      { status: 500 }
    )
  }
}