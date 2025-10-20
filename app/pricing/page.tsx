'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Crown, Sparkles, Users, Zap, HelpCircle, Calendar } from 'lucide-react'
import { TIER_PRICING, TIER_PRICING_ANNUAL, PlanTier } from '@/lib/tiers'

interface PricingTier {
  name: string
  plan: PlanTier
  price: number
  description: string
  icon: React.ReactNode
  popular?: boolean
  features: string[]
  bestFor: string
}

const tiers: PricingTier[] = [
  {
    name: 'Free',
    plan: 'free',
    price: 0,
    description: 'Perfect for trying out Syncthesis',
    icon: <Sparkles className="h-6 w-6" />,
    bestFor: 'Individuals exploring AI scheduling automation',
    features: [
      '5 meetings per month',
      '2 participants max per meeting',
      '1 calendar account per provider',
      'Basic scheduling automation',
      'Email invitations and notifications',
      'Google Calendar & Outlook integration',
    ],
  },
  {
    name: 'Professional',
    plan: 'professional',
    price: TIER_PRICING.professional,
    description: 'For freelancers and consultants',
    icon: <Zap className="h-6 w-6" />,
    bestFor: 'Freelancers and independent professionals',
    features: [
      'Unlimited meetings per month',
      'Custom event types and templates',
      '3 calendar accounts per provider',
      'Automated reminders and notifications',
      'AI preference learning engine',
      '1 automated follow-up (48h)',
      'Priority email support',
    ],
  },
  {
    name: 'Business',
    plan: 'business',
    price: TIER_PRICING.business,
    description: 'For teams and growing businesses',
    icon: <Users className="h-6 w-6" />,
    popular: true,
    bestFor: 'Teams and growing businesses',
    features: [
      'Everything in Professional',
      'Team scheduling features',
      'API integrations and webhooks',
      'Up to 5 group meeting participants',
      '5 calendar accounts per provider',
      '2 automated follow-ups',
      'Custom follow-up templates',
      'Follow-up analytics and insights',
      'Advanced reporting dashboard',
    ],
  },
  {
    name: 'Coaching',
    plan: 'coaching',
    price: TIER_PRICING.coaching,
    description: 'For coaches and course creators',
    icon: <Crown className="h-6 w-6" />,
    bestFor: 'Coaches, consultants, and course creators',
    features: [
      'Everything in Business',
      'Group meeting rescheduling',
      'Up to 10 group participants',
      'Recurring session scheduling',
      'Coaching package management',
      'Payment collection integration',
      'Custom intake forms',
      '10 calendar accounts',
      '5 automated follow-ups',
      'White-label options',
    ],
  },
]

const faqs = [
  {
    question: 'How does the free plan work?',
    answer: 'The free plan is free forever with no credit card required. You get 5 meetings per month with up to 2 participants. Perfect for individuals testing our AI-powered scheduling automation.'
  },
  {
    question: 'Can I change plans at any time?',
    answer: 'Yes! You can upgrade or downgrade your plan at any time. Upgrades take effect immediately, and downgrades take effect at the end of your current billing period. No cancellation fees.'
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover) through our secure Stripe integration. Enterprise customers can also pay via invoice.'
  },
  {
    question: 'Do you offer annual billing discounts?',
    answer: 'Yes! Save 20% with annual billing. Toggle between monthly and annual pricing above to see your savings. Professional: $144/year ($12/mo), Business: $336/year ($28/mo), Coaching: $624/year ($52/mo).'
  },
  {
    question: 'What happens when I reach my meeting limit?',
    answer: 'On the free plan, you\'ll need to wait until your monthly limit resets or upgrade to a paid plan. Paid plans offer unlimited meetings, so you never have to worry about hitting a limit.'
  },
  {
    question: 'Is there a setup fee or contract required?',
    answer: 'No setup fees and no long-term contracts required. All paid plans are month-to-month subscriptions that you can cancel anytime. Start, pause, or cancel without penalties.'
  },
  {
    question: 'Do you offer refunds?',
    answer: 'Yes, we offer a 30-day money-back guarantee on all paid plans. If you\'re not satisfied for any reason, contact support for a full refund within 30 days of purchase.'
  },
  {
    question: 'Can I connect multiple calendar accounts?',
    answer: 'Yes! The number of calendar accounts you can connect depends on your plan. Free includes 1 per provider, Professional includes 3, Business includes 5, and Coaching includes 10 calendar accounts.'
  }
]

export default function PricingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [isAnnual, setIsAnnual] = useState(false)

  useEffect(() => {
    // Set document title for SEO
    document.title = 'Pricing - Syncthesis Calendar Scheduling Software | Plans Starting at $0'

    // Set meta description
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Compare Syncthesis pricing plans for calendar scheduling and meeting coordination. Free forever plan available. Professional ($15/mo), Business ($35/mo), and Coaching ($65/mo) plans with advanced features. No credit card required to start.')
    }

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
      router.push('/login?redirect=/pricing')
      return
    }

    if (plan === 'free') {
      return
    }

    setLoading(plan)

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          userId: currentUser.id,
          interval: isAnnual ? 'year' : 'month'
        })
      })

      const data = await response.json()

      if (data.url) {
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

  // Generate JSON-LD structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Syncthesis Calendar Scheduling Software",
    "description": "AI-powered calendar scheduling and meeting coordination platform with automated reminders, multi-calendar sync, and smart time suggestions",
    "brand": {
      "@type": "Brand",
      "name": "Syncthesis"
    },
    "offers": tiers.map(tier => ({
      "@type": "Offer",
      "name": `${tier.name} Plan`,
      "price": tier.price,
      "priceCurrency": "USD",
      "description": tier.description,
      "availability": "https://schema.org/InStock"
    }))
  }

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Navigation */}
        <nav className="bg-white border-b border-slate-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold text-slate-900">Syncthesis</span>
            </Link>
            <div className="flex items-center gap-4">
              {currentUser ? (
                <>
                  <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
                    Dashboard
                  </Link>
                  <Link href="/account" className="text-slate-600 hover:text-slate-900">
                    Account
                  </Link>
                </>
              ) : (
                <Link href="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* Header */}
        <header className="max-w-7xl mx-auto px-6 py-16 text-center">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Calendar Scheduling Software Pricing
          </h1>
          <p className="text-xl text-slate-600 mb-4 max-w-3xl mx-auto">
            Choose the perfect plan for your meeting scheduling needs. Start free forever or unlock unlimited meetings, team features, and AI-powered automation.
          </p>
          <p className="text-lg text-slate-500 mb-8">
            No credit card required • Cancel anytime • 30-day money-back guarantee
          </p>
          {currentUser && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
              <Crown className="h-4 w-4" />
              Current Plan: <strong>{currentUser.plan.charAt(0).toUpperCase() + currentUser.plan.slice(1)}</strong>
            </div>
          )}
        </header>

        {/* Billing Toggle */}
        <div className="max-w-7xl mx-auto px-6 pb-8">
          <div className="flex justify-center items-center space-x-4">
            <span className={`text-sm font-medium ${!isAnnual ? 'text-slate-900' : 'text-slate-600'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-14 h-7 bg-slate-200 rounded-full border border-slate-300 transition-colors hover:bg-slate-300"
              aria-label="Toggle billing period"
            >
              <div className={`absolute top-1 ${isAnnual ? 'right-1' : 'left-1'} w-5 h-5 bg-blue-600 rounded-full transition-all shadow-sm`} />
            </button>
            <span className={`text-sm font-medium ${isAnnual ? 'text-slate-900' : 'text-slate-600'}`}>
              Annual
              <span className="text-green-600 ml-2 text-sm font-bold">Save 20%</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <section className="max-w-7xl mx-auto px-6 pb-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers.map((tier) => (
              <article
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

                  <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    {tier.name}
                  </h2>
                  <p className="text-slate-600 text-sm mb-2">
                    {tier.description}
                  </p>
                  <p className="text-xs text-slate-500 mb-6">
                    {tier.bestFor}
                  </p>

                  <div className="mb-6">
                    {tier.price === 0 ? (
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-slate-900">$0</span>
                        <span className="text-slate-600 ml-2">/month</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline">
                          <span className="text-4xl font-bold text-slate-900">
                            ${isAnnual ? Math.round(TIER_PRICING_ANNUAL[tier.plan] / 12) : tier.price}
                          </span>
                          <span className="text-slate-600 ml-2">/month</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {isAnnual
                            ? `$${TIER_PRICING_ANNUAL[tier.plan]}/year • Save 20%`
                            : 'Billed monthly • Cancel anytime'
                          }
                        </p>
                      </>
                    )}
                  </div>

                  {tier.plan === 'free' ? (
                    <Link
                      href="/create"
                      className="w-full block text-center px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                    >
                      Get Started Free
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
                      {loading === tier.plan ? 'Processing...' : 'Start Free Trial'}
                    </button>
                  )}

                  <ul className="mt-8 space-y-3">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Trust Signals */}
        <section className="max-w-5xl mx-auto px-6 pb-16">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Trusted by Thousands of Professionals
            </h2>
            <p className="text-slate-600 mb-6">
              Join freelancers, consultants, coaches, and teams who have eliminated scheduling headaches with Syncthesis
            </p>
            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">99.9%</div>
                <div className="text-sm text-slate-600">Uptime</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">10k+</div>
                <div className="text-sm text-slate-600">Meetings Scheduled</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600 mb-2">4.9/5</div>
                <div className="text-sm text-slate-600">Customer Rating</div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center">
            Frequently Asked Questions About Pricing
          </h2>
          <p className="text-center text-slate-600 mb-8">
            Everything you need to know about our calendar scheduling software plans
          </p>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <h3 className="font-semibold text-slate-900">{faq.question}</h3>
                  <HelpCircle className={`h-5 w-5 text-slate-400 transition-transform ${
                    openFaq === index ? 'rotate-180' : ''
                  }`} />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-4 text-slate-600 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Automate Your Meeting Scheduling?
            </h2>
            <p className="text-xl mb-8 text-blue-50">
              Start with our free forever plan. No credit card required. Upgrade anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/create"
                className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
              >
                Start Free Now
              </Link>
              <Link
                href="/support"
                className="px-8 py-4 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-8">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center space-x-2 mb-4 md:mb-0">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">Syncthesis</span>
              </div>
              <div className="flex space-x-6 text-sm text-slate-600">
                <Link href="/pricing" className="hover:text-slate-900">Pricing</Link>
                <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
                <Link href="/terms" className="hover:text-slate-900">Terms</Link>
                <Link href="/support" className="hover:text-slate-900">Support</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
