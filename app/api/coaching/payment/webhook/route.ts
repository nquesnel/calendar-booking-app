import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.metadata?.coachingSessionId) {
          await handlePaymentSuccess(session)
        }
        break

      case 'checkout.session.expired':
        const expiredSession = event.data.object as Stripe.Checkout.Session
        
        if (expiredSession.metadata?.coachingSessionId) {
          await handlePaymentExpired(expiredSession)
        }
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handlePaymentSuccess(session: Stripe.Checkout.Session) {
  try {
    const coachingSessionId = session.metadata?.coachingSessionId

    if (!coachingSessionId) {
      throw new Error('Missing coaching session ID in metadata')
    }

    // Update coaching session
    await prisma.coachingSession.update({
      where: { id: coachingSessionId },
      data: {
        paymentStatus: 'paid',
        paymentId: session.id
      }
    })

    console.log(`Payment successful for coaching session: ${coachingSessionId}`)
  } catch (error) {
    console.error('Error handling payment success:', error)
  }
}

async function handlePaymentExpired(session: Stripe.Checkout.Session) {
  try {
    const coachingSessionId = session.metadata?.coachingSessionId

    if (!coachingSessionId) {
      throw new Error('Missing coaching session ID in metadata')
    }

    // Update coaching session
    await prisma.coachingSession.update({
      where: { id: coachingSessionId },
      data: {
        paymentStatus: 'failed'
      }
    })

    console.log(`Payment expired for coaching session: ${coachingSessionId}`)
  } catch (error) {
    console.error('Error handling payment expiration:', error)
  }
}