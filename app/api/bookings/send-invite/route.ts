import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, getBookingInviteEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { shareLink, recipientEmail, creatorName, meetingTitle } = body

    if (!shareLink || !recipientEmail || !creatorName || !meetingTitle) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Send the meeting invite email
    const result = await sendEmail({
      to: recipientEmail,
      subject: `Meeting Request: ${meetingTitle} - CalendarSync`,
      html: getBookingInviteEmail(
        recipientEmail.split('@')[0], // Use email prefix as name fallback
        creatorName,
        meetingTitle,
        shareLink
      )
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Meeting invite sent successfully'
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error sending invite email:', error)
    return NextResponse.json(
      { error: 'Failed to send invite email' },
      { status: 500 }
    )
  }
}