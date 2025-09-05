import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { hasAccess } from '@/lib/tiers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      coachingSessionId, 
      successUrl, 
      cancelUrl,
      customerEmail,
      customerName 
    } = body

    // Get coaching session with package info
    const session = await prisma.coachingSession.findUnique({
      where: { id: coachingSessionId },
      include: {
        package: {
          include: {
            coach: true
          }
        },
        booking: true
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
        { error: 'Coaching session not associated with a package' },
        { status: 400 }
      )
    }

    // Check if coach has payment access
    if (!hasAccess(session.package.coach.plan as any, 'paymentCollection')) {
      return NextResponse.json(
        { error: 'Payment collection requires Coaching plan' },
        { status: 403 }
      )
    }

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${session.package.name} - Session ${session.sessionNumber}`,
              description: session.package.description || undefined,
            },
            unit_amount: Math.round((session.package.pricePerSession || 0) * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        coachingSessionId: session.id,
        packageId: session.packageId || '',
        coachId: session.package.coachId,
        customerEmail: customerEmail,
        customerName: customerName
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    // Update session with payment ID
    await prisma.coachingSession.update({
      where: { id: coachingSessionId },
      data: {
        paymentId: checkoutSession.id,
        paymentStatus: 'pending'
      }
    })

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url
    })
  } catch (error) {
    console.error('Error creating payment session:', error)
    return NextResponse.json(
      { error: 'Failed to create payment session' },
      { status: 500 }
    )
  }
}