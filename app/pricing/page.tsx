'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Crown, Sparkles, Users, Zap } from 'lucide-react'
import { TIER_PRICING, PlanTier } from '@/lib/tiers'

interface PricingTier {
  name: string
  plan: PlanTier
  price: number
  description: string
  icon: React.ReactNode
  popular?: boolean
  features: string[]
}

const tiers: PricingTier[] = [
  {
    name: 'Free',
    plan: 'free',
    price: 0,
    description: 'Perfect for trying out Syncthesis',
    icon: <Sparkles className="h-6 w-6" />,
    features: [
      '5 meetings per month',
      '2 participants max',
      '1 calendar account per provider',
      'Basic scheduling',
      'Email invitations',
    ],
  },
  {
    name: 'Professional',
    plan: 'professional',
    price: TIER_PRICING.professional,
    description: 'For freelancers and consultants',
    icon: <Zap className="h-6 w-6" />,
    features: [
      'Unlimited meetings',
      'Custom event types',
      '3 calendar accounts per provider',
      'Automated reminders',
      'Preference engine',
      '1 automated follow-up (48h)',
    ],
  },
  {
    name: 'Business',
    plan: 'business',
    price: TIER_PRICING.business,
    description: 'For teams and growing businesses',
    icon: <Users className="h-6 w-6" />,
    popular: true,
    features: [
      'Everything in Professional',
      'Team features',
      'API integrations',
      '5 group participants',
      '5 calendar accounts per provider',
      '2 automated follow-ups',
      'Custom follow-up templates',
      'Follow-up analytics',
    ],
  },
  {
    name: 'Coaching',
    plan: 'coaching',
    price: TIER_PRICING.coaching,
    description: 'For coaches and course creators',
    icon: <Crown className="h-6 w-6" />,
    features: [
      'Everything in Business',
      'Group rescheduling',
      '10 group participants',
      'Recurring sessions',
      'Coaching packages',
      'Payment collection',
      'Intake forms',
      '10 calendar accounts',
      '5 automated follow-ups',
    ],
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/profile')
      const data = await response.json()
      if (data.profile) {
        setCurrentUser(data.profile)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  const handleUpgrade = async (plan: PlanTier) => {
    if (!currentUser) {
      // Redirect to login
      router.push('/login?redirect=/pricing')
      return
    }

    if (plan === 'free') {
      // Can't "upgrade" to free
      return
    }

    setLoading(plan)

    try {
      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          userId: currentUser.id
        })
      })

      const data = await response.json()

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
      alert('Failed to start checkout. Please try again.')
      setLoading(null)
    }
  }

  const isCurrentPlan = (plan: PlanTier) => {
    return currentUser?.plan === plan
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-slate-900">
            Syncthesis
          </Link>
          <div className="flex items-center gap-4">
            {currentUser ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-slate-600 hover:text-slate-900"
                >
                  Dashboard
                </Link>
                <Link
                  href="/account"
                  className="text-slate-600 hover:text-slate-900"
                >
                  Account
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <h1 className="text-5xl font-bold text-slate-900 mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-slate-600 mb-8">
          Start free, upgrade when you need more power
        </p>
        {currentUser && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
            <Crown className="h-4 w-4" />
            Current Plan: <strong>{currentUser.plan.charAt(0).toUpperCase() + currentUser.plan.slice(1)}</strong>
          </div>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.plan}
              className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all hover:shadow-xl ${
                tier.popular
                  ? 'border-blue-500 scale-105'
                  : 'border-slate-200'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                    Most Popular
                  </div>
                </div>
              )}

              <div className="p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${
                    tier.popular ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tier.icon}
                  </div>
                  {isCurrentPlan(tier.plan) && (
                    <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                      Current
                    </div>
                  )}
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  {tier.name}
                </h3>
                <p className="text-slate-600 text-sm mb-6">
                  {tier.description}
                </p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-slate-900">
                      ${tier.price}
                    </span>
                    <span className="text-slate-600 ml-2">/month</span>
                  </div>
                </div>

                {/* CTA Button */}
                {tier.plan === 'free' ? (
                  <Link
                    href="/create"
                    className="w-full block text-center px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                  >
                    Get Started
                  </Link>
                ) : isCurrentPlan(tier.plan) ? (
                  <Link
                    href="/account"
                    className="w-full block text-center px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                  >
                    Manage Plan
                  </Link>
                ) : (
                  <button
                    onClick={() => handleUpgrade(tier.plan)}
                    disabled={loading === tier.plan}
                    className={`w-full px-6 py-3 font-semibold rounded-lg transition-all ${
                      tier.popular
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {loading === tier.plan ? 'Processing...' : 'Upgrade Now'}
                  </button>
                )}

                {/* Features */}
                <ul className="mt-8 space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ or Footer */}
      <div className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h3 className="text-2xl font-bold text-slate-900 mb-4">
            Questions?
          </h3>
          <p className="text-slate-600 mb-6">
            Need help choosing the right plan? Contact us and we'll help you find the perfect fit.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
          >
            View Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
