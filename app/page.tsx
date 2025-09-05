'use client'

import Link from 'next/link'
import { Calendar, Clock, CheckCircle, Users, Zap, Shield } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function LandingPage() {
  const [isAnnual, setIsAnnual] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Check if user was just logged out
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('logged_out') === 'true') {
      setIsLoggedIn(false)
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname)
      // Clear any browser storage
      localStorage.clear()
      sessionStorage.clear()
    } else {
      checkLoginStatus()
    }
  }, [])

  const checkLoginStatus = async () => {
    try {
      // Check if user was manually logged out
      if (typeof window !== 'undefined' && localStorage.getItem('logged_out') === 'true') {
        setIsLoggedIn(false)
        return
      }
      
      const response = await fetch('/api/profile')
      const data = await response.json()
      setIsLoggedIn(!!data.profile)
    } catch (error) {
      setIsLoggedIn(false)
    }
  }

  if (!mounted) {
    return null
  }

  const plans = [
    {
      name: 'Free',
      price: '0',
      description: 'Perfect for getting started',
      features: [
        '5 bookings per month',
        'Google & Outlook calendar sync',
        'Smart time suggestions',
        'Email notifications',
        'Basic support'
      ],
      cta: 'Start Free',
      highlighted: false
    },
    {
      name: 'Pro',
      price: isAnnual ? '12' : '15',
      description: 'For professionals and freelancers',
      features: [
        'Unlimited bookings',
        'Custom branding',
        'Priority time suggestions',
        'Calendar analytics',
        'Priority support',
        'Remove CalendarSync branding'
      ],
      cta: 'Start Pro Trial',
      highlighted: true
    },
    {
      name: 'Team',
      price: isAnnual ? '39' : '49',
      description: 'For teams and organizations',
      features: [
        'Everything in Pro',
        'Multi-person scheduling (5+ calendars)',
        'Team dashboard',
        'Advanced analytics',
        'API access',
        'Dedicated support'
      ],
      cta: 'Contact Sales',
      highlighted: false
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200 sticky top-0 bg-white z-50">
        <div className="container-width py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-semibold">CalendarSync</span>
          </div>
          <div className="flex items-center space-x-3">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" className="btn-secondary flex items-center whitespace-nowrap">
                  <Calendar className="h-4 w-4 mr-1" />
                  Dashboard
                </Link>
                <Link href="/create" className="btn-primary flex items-center whitespace-nowrap">
                  New Meeting
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-secondary flex items-center whitespace-nowrap">
                  Sign In
                </Link>
                <Link href="/create" className="btn-primary flex items-center whitespace-nowrap">
                  Schedule Meeting
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 md:py-24">
        <div className="container-width">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              End the Back-and-Forth of
              <span className="text-blue-600"> Meeting Scheduling</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-8">
              Connect calendars in 30 seconds. AI finds the perfect time. 
              No accounts required to start.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/create" className="btn-primary text-lg px-8 py-4">
                Create Your First Booking
              </Link>
              <button className="btn-secondary text-lg px-8 py-4">
                See How It Works
              </button>
            </div>
            <p className="text-sm text-slate-600 mt-4">
              No credit card required • 5 free bookings per month
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-slate-50">
        <div className="container-width">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Schedule Meetings in 4 Simple Steps
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Create Request',
                description: 'Enter meeting details and get a shareable link',
                icon: <Calendar className="h-8 w-8 text-blue-600" />
              },
              {
                step: '2',
                title: 'Share Link',
                description: 'Send the link to your meeting partner',
                icon: <Users className="h-8 w-8 text-blue-600" />
              },
              {
                step: '3',
                title: 'Connect Calendars',
                description: 'Both parties connect their calendars securely',
                icon: <Zap className="h-8 w-8 text-blue-600" />
              },
              {
                step: '4',
                title: 'Confirm Time',
                description: 'AI suggests optimal times, confirm and done',
                icon: <CheckCircle className="h-8 w-8 text-blue-600" />
              }
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <div className="flex justify-center mb-4">{item.icon}</div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">{item.step}</div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-slate-600 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container-width">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Built for Busy Professionals
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Clock className="h-6 w-6 text-blue-600" />,
                title: '30-Second Setup',
                description: 'Connect your calendar instantly with OAuth. No complex configuration.'
              },
              {
                icon: <Zap className="h-6 w-6 text-blue-600" />,
                title: 'AI-Powered Suggestions',
                description: 'Smart algorithm finds the best meeting times based on both schedules.'
              },
              {
                icon: <Shield className="h-6 w-6 text-blue-600" />,
                title: 'Secure & Private',
                description: 'Enterprise-grade security. We never store your calendar data.'
              },
              {
                icon: <Calendar className="h-6 w-6 text-blue-600" />,
                title: 'Works with Your Calendar',
                description: 'Seamless integration with Google Calendar and Microsoft Outlook.'
              },
              {
                icon: <Users className="h-6 w-6 text-blue-600" />,
                title: 'No Account Required',
                description: 'Recipients can book meetings without creating an account.'
              },
              {
                icon: <CheckCircle className="h-6 w-6 text-blue-600" />,
                title: 'Automatic Confirmations',
                description: 'Meetings are added to both calendars automatically.'
              }
            ].map((feature, idx) => (
              <div key={idx} className="card">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">{feature.icon}</div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-slate-600">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 bg-slate-50" id="pricing">
        <div className="container-width">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-center text-slate-600 mb-8">
            Start free, upgrade when you need more
          </p>
          
          {/* Billing Toggle */}
          <div className="flex justify-center items-center space-x-4 mb-12">
            <span className={`${!isAnnual ? 'text-slate-900' : 'text-slate-600'}`}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-14 h-7 bg-slate-200 rounded-full border border-slate-300"
            >
              <div className={`absolute top-1 ${isAnnual ? 'right-1' : 'left-1'} w-5 h-5 bg-blue-600 rounded-full transition-all`} />
            </button>
            <span className={`${isAnnual ? 'text-slate-900' : 'text-slate-600'}`}>
              Annual
              <span className="text-green-600 ml-1 text-sm font-medium">Save 20%</span>
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`card ${plan.highlighted ? 'ring-2 ring-blue-600' : ''}`}
              >
                {plan.highlighted && (
                  <div className="bg-blue-600 text-white text-center py-1 px-4 rounded-full text-sm font-medium mb-4 inline-block">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-slate-600 mb-4">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  {plan.price !== '0' && <span className="text-slate-600">/month</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/create"
                  className={`block text-center py-3 px-6 rounded-lg font-medium transition-all ${
                    plan.highlighted
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container-width text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Simplify Your Scheduling?
          </h2>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who've eliminated scheduling headaches
          </p>
          <Link href="/create" className="btn-primary text-lg px-8 py-4">
            Create Your First Booking - It's Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="container-width">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">CalendarSync</span>
            </div>
            <div className="flex space-x-6 text-sm text-slate-600">
              <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
              <Link href="/terms" className="hover:text-slate-900">Terms</Link>
              <Link href="/support" className="hover:text-slate-900">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}