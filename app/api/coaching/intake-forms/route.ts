import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hasAccess } from '@/lib/tiers'

const DEMO_USER_EMAIL = 'neal@whatarmy.com'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { coachingSessionId, formData } = body

    // Get coaching session
    const session = await prisma.coachingSession.findUnique({
      where: { id: coachingSessionId },
      include: {
        package: {
          include: {
            coach: true
          }
        }
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Coaching session not found' },
        { status: 404 }
      )
    }

    if (!session.package) {
      return NextResponse.json(
        { error: 'Session not associated with a package' },
        { status: 400 }
      )
    }

    // Check if coach has intake form access
    if (!hasAccess(session.package.coach.plan as any, 'intakeForms')) {
      return NextResponse.json(
        { error: 'Intake forms require Coaching plan' },
        { status: 403 }
      )
    }

    // Save intake form data
    await prisma.coachingSession.update({
      where: { id: coachingSessionId },
      data: {
        intakeFormData: JSON.stringify(formData)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Intake form saved successfully'
    })
  } catch (error) {
    console.error('Error saving intake form:', error)
    return NextResponse.json(
      { error: 'Failed to save intake form' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const coachingSessionId = searchParams.get('sessionId')

    if (!coachingSessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      )
    }

    // Get intake form data
    const session = await prisma.coachingSession.findUnique({
      where: { id: coachingSessionId },
      select: {
        intakeFormData: true,
        package: {
          include: {
            coach: true
          }
        }
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Coaching session not found' },
        { status: 404 }
      )
    }

    if (!session.package) {
      return NextResponse.json(
        { error: 'Session not associated with a package' },
        { status: 400 }
      )
    }

    // Check if coach has intake form access
    if (!hasAccess(session.package.coach.plan as any, 'intakeForms')) {
      return NextResponse.json(
        { error: 'Intake forms require Coaching plan' },
        { status: 403 }
      )
    }

    const formData = session.intakeFormData 
      ? JSON.parse(session.intakeFormData)
      : null

    return NextResponse.json({
      formData: formData
    })
  } catch (error) {
    console.error('Error fetching intake form:', error)
    return NextResponse.json(
      { error: 'Failed to fetch intake form' },
      { status: 500 }
    )
  }
}