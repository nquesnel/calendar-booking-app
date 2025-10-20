import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_PRICES, STRIPE_PRICES_ANNUAL, getOrCreateStripeCustomer } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import { PlanTier } from '@/lib/tiers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { plan, userId, interval = 'month' } = body

    // Validate plan
    const validPlans: PlanTier[] = ['professional', 'business', 'coaching']
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      )
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      user.id,
      user.email,
      user.name
    )

    // Get price ID for selected plan and billing interval
    const priceMap = interval === 'year' ? STRIPE_PRICES_ANNUAL : STRIPE_PRICES
    const priceId = priceMap[plan as Exclude<PlanTier, 'free' | 'super_admin'>]

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/account?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        plan: plan,
        interval: interval,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan: plan,
          interval: interval,
        },
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
