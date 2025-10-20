import Stripe from 'stripe'
import { PlanTier } from './tiers'

// Initialize Stripe with secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...', {
  apiVersion: '2025-07-30.basil',
})

// Client-side Stripe configuration
export const getStripe = () => {
  if (typeof window !== 'undefined') {
    const stripePromise = import('@stripe/stripe-js').then(({ loadStripe }) =>
      loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_...')
    )
    return stripePromise
  }
  return null
}

export const STRIPE_CONFIG = {
  currency: 'usd',
  payment_method_types: ['card'],
  mode: 'payment' as const,
}

// Stripe Price IDs for subscription tiers (monthly)
// These will be set as environment variables
export const STRIPE_PRICES: Record<Exclude<PlanTier, 'free' | 'super_admin'>, string> = {
  professional: process.env.STRIPE_PRICE_PROFESSIONAL || '',
  business: process.env.STRIPE_PRICE_BUSINESS || '',
  coaching: process.env.STRIPE_PRICE_COACHING || '',
}

// Stripe Price IDs for annual billing
export const STRIPE_PRICES_ANNUAL: Record<Exclude<PlanTier, 'free' | 'super_admin'>, string> = {
  professional: process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL || '',
  business: process.env.STRIPE_PRICE_BUSINESS_ANNUAL || '',
  coaching: process.env.STRIPE_PRICE_COACHING_ANNUAL || '',
}

// Map Stripe price IDs back to plan tiers (for webhook processing)
// Supports both monthly and annual price IDs
export function getPlanFromPriceId(priceId: string): PlanTier | null {
  const priceMap: Record<string, PlanTier> = {}

  // Monthly prices
  if (process.env.STRIPE_PRICE_PROFESSIONAL) {
    priceMap[process.env.STRIPE_PRICE_PROFESSIONAL] = 'professional'
  }
  if (process.env.STRIPE_PRICE_BUSINESS) {
    priceMap[process.env.STRIPE_PRICE_BUSINESS] = 'business'
  }
  if (process.env.STRIPE_PRICE_COACHING) {
    priceMap[process.env.STRIPE_PRICE_COACHING] = 'coaching'
  }

  // Annual prices
  if (process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL) {
    priceMap[process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL] = 'professional'
  }
  if (process.env.STRIPE_PRICE_BUSINESS_ANNUAL) {
    priceMap[process.env.STRIPE_PRICE_BUSINESS_ANNUAL] = 'business'
  }
  if (process.env.STRIPE_PRICE_COACHING_ANNUAL) {
    priceMap[process.env.STRIPE_PRICE_COACHING_ANNUAL] = 'coaching'
  }

  return priceMap[priceId] || null
}

// Helper to get or create Stripe customer
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name: string
): Promise<string> {
  const { prisma } = await import('./db')

  // Check if user already has a Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true }
  })

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  })

  // Save customer ID to database
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id }
  })

  return customer.id
}