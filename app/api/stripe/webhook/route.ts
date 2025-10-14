import { NextRequest, NextResponse } from 'next/server'
import { stripe, getPlanFromPriceId } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import Stripe from 'stripe'

// Disable body parsing - Stripe needs raw body for signature verification
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (err: any) {
    console.error('⚠️ Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  console.log(`✅ Webhook received: ${event.type}`)

  try {
    switch (event.type) {
      // Subscription created
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      // Subscription updated (plan change, status change, etc.)
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      // Subscription deleted/canceled
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      // Checkout session completed
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      // Invoice paid
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      // Invoice payment failed
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`🔔 Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('🆕 Subscription created:', subscription.id)

  const userId = subscription.metadata.userId
  const plan = subscription.metadata.plan || getPlanFromPriceId(subscription.items.data[0].price.id)

  if (!userId || !plan) {
    console.error('Missing userId or plan in subscription metadata')
    return
  }

  // Type assertion for subscription properties
  const sub = subscription as any

  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: plan,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: subscription.status,
      subscriptionEndsAt: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  })

  console.log(`✅ User ${userId} upgraded to ${plan}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Subscription updated:', subscription.id)

  // Find user by subscription ID
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id }
  })

  if (!user) {
    console.error('User not found for subscription:', subscription.id)
    return
  }

  // Determine plan from price ID
  const plan = subscription.metadata.plan || getPlanFromPriceId(subscription.items.data[0].price.id)

  if (!plan) {
    console.error('Could not determine plan from subscription')
    return
  }

  // Type assertion for subscription properties
  const sub = subscription as any

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: plan,
      stripeSubscriptionStatus: subscription.status,
      subscriptionEndsAt: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
    },
  })

  console.log(`✅ User ${user.id} subscription updated: ${plan} (${subscription.status})`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('❌ Subscription deleted:', subscription.id)

  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id }
  })

  if (!user) {
    console.error('User not found for subscription:', subscription.id)
    return
  }

  // Downgrade to free plan
  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: 'free',
      stripeSubscriptionStatus: 'canceled',
      stripeSubscriptionId: null,
      subscriptionEndsAt: null,
      cancelAtPeriodEnd: false,
    },
  })

  console.log(`✅ User ${user.id} downgraded to free plan`)
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('💳 Checkout completed:', session.id)

  const userId = session.metadata?.userId

  if (!userId) {
    console.error('Missing userId in checkout session metadata')
    return
  }

  // Subscription will be handled by subscription.created event
  // Just ensure customer ID is saved
  if (session.customer) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId: session.customer as string
      },
    })
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log('💰 Invoice paid:', invoice.id)

  // Type assertion for invoice properties
  const inv = invoice as any

  if (!inv.subscription) {
    return
  }

  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: inv.subscription as string }
  })

  if (user && user.stripeSubscriptionStatus !== 'active') {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeSubscriptionStatus: 'active'
      },
    })
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('⚠️ Invoice payment failed:', invoice.id)

  // Type assertion for invoice properties
  const inv = invoice as any

  if (!inv.subscription) {
    return
  }

  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: inv.subscription as string }
  })

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeSubscriptionStatus: 'past_due'
      },
    })

    console.log(`⚠️ User ${user.id} subscription is now past_due`)
  }
}
