import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId } = body

    // Get user with Stripe customer ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeCustomerId: true
      }
    })

    if (!user || !user.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing information found' },
        { status: 404 }
      )
    }

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/account`,
    })

    return NextResponse.json({
      url: portalSession.url
    })
  } catch (error) {
    console.error('Error creating portal session:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
