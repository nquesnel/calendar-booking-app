'use client'

import Link from 'next/link'
import { Calendar, Mail, MessageCircle, Book, HelpCircle, ExternalLink } from 'lucide-react'
import { useState } from 'react'

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement support ticket submission
    console.log('Support request:', formData)
    setSubmitted(true)

    // Reset form after 3 seconds
    setTimeout(() => {
      setSubmitted(false)
      setFormData({ name: '', email: '', subject: '', message: '' })
    }, 3000)
  }

  const faqs = [
    {
      question: 'How do I connect my calendar?',
      answer: 'Simply click "Connect Google Calendar" or "Connect Outlook" on the create meeting page. You\'ll be redirected to securely authenticate with your calendar provider using OAuth. We never store your calendar password.'
    },
    {
      question: 'Can I use multiple calendars?',
      answer: 'Yes! Higher tier plans allow you to connect multiple calendar accounts per provider. Professional allows 3 calendars, Business allows 5, and Coaching allows 10 calendar accounts.'
    },
    {
      question: 'How does the AI suggest meeting times?',
      answer: 'Our algorithm analyzes the free/busy information from all participants\' calendars, considers your preferences (time of day, meeting duration), and suggests optimal times that work for everyone.'
    },
    {
      question: 'What happens to my data if I cancel?',
      answer: 'When you cancel your subscription, you\'ll retain access until the end of your billing period. If you delete your account, all your personal data will be permanently deleted within 30 days.'
    },
    {
      question: 'Can meeting participants use Syncthesis without an account?',
      answer: 'Yes! The meeting organizer needs an account, but participants can simply connect their calendar via the booking link without creating a Syncthesis account.'
    },
    {
      question: 'How do I upgrade or downgrade my plan?',
      answer: 'Visit your account settings and click "Manage Billing" to access the Stripe billing portal where you can upgrade, downgrade, or cancel your subscription.'
    },
    {
      question: 'Is my calendar data secure?',
      answer: 'Absolutely. We use enterprise-grade encryption (SSL/TLS), OAuth 2.0 authentication, and never store your calendar passwords. We only read free/busy information needed for scheduling.'
    },
    {
      question: 'Do you offer refunds?',
      answer: 'Refunds are considered on a case-by-case basis. If you cancel, you retain access until the end of your current billing period. Please contact support if you have specific concerns.'
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-slate-900">Syncthesis</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-slate-600 hover:text-slate-900"
            >
              Dashboard
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 to-slate-50 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            How Can We Help?
          </h1>
          <p className="text-xl text-slate-600">
            Find answers to common questions or get in touch with our support team
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Link
            href="#faq"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <HelpCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">FAQ</h3>
                <p className="text-slate-600 text-sm">
                  Browse frequently asked questions
                </p>
              </div>
            </div>
          </Link>

          <a
            href="mailto:support@syncthesis.co"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Email Support</h3>
                <p className="text-slate-600 text-sm">
                  support@syncthesis.co
                </p>
              </div>
            </div>
          </a>

          <Link
            href="#contact"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <MessageCircle className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Contact Form</h3>
                <p className="text-slate-600 text-sm">
                  Send us a detailed message
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* FAQ Section */}
        <div id="faq" className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="card cursor-pointer hover:shadow-md transition-shadow"
              >
                <summary className="font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between">
                  <span>{faq.question}</span>
                  <HelpCircle className="h-5 w-5 text-slate-400 flex-shrink-0 ml-2" />
                </summary>
                <div className="mt-4 text-slate-700 leading-relaxed border-t border-slate-200 pt-4">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>

        {/* Resources Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
            Helpful Resources
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="card">
              <div className="flex items-start space-x-4">
                <Book className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Getting Started Guide</h3>
                  <p className="text-slate-600 text-sm mb-3">
                    Learn how to create your first meeting and connect your calendar
                  </p>
                  <Link
                    href="/create"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                  >
                    Create a Meeting
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-start space-x-4">
                <Calendar className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Calendar Integrations</h3>
                  <p className="text-slate-600 text-sm mb-3">
                    Connect Google Calendar and Microsoft Outlook
                  </p>
                  <Link
                    href="/account"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                  >
                    Manage Connections
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div id="contact" className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center">
            Still Need Help?
          </h2>
          <p className="text-center text-slate-600 mb-8">
            Send us a message and we'll get back to you within 24 hours
          </p>

          {submitted ? (
            <div className="card bg-green-50 border-green-200">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <MessageCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-green-900 mb-2">
                  Message Sent!
                </h3>
                <p className="text-green-700">
                  We've received your message and will respond within 24 hours.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="card">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="input-field"
                    placeholder="How can we help?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Message
                  </label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="input-field min-h-[150px]"
                    placeholder="Please describe your question or issue in detail..."
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full"
                >
                  Send Message
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Contact Info */}
        <div className="mt-12 text-center text-slate-600">
          <p className="mb-2">You can also reach us directly:</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="mailto:support@syncthesis.co"
              className="flex items-center text-blue-600 hover:text-blue-700"
            >
              <Mail className="h-5 w-5 mr-2" />
              support@syncthesis.co
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">Syncthesis</span>
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
