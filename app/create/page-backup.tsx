'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, ArrowLeft, Clock, Mail, User, FileText, Copy, Check, Zap, Edit2, RefreshCw } from 'lucide-react'

export default function CreateBooking() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState(1) // 1: Connect Calendar, 2: Create Meeting, 3: Share Link
  const [shareLink, setShareLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [connectedProvider, setConnectedProvider] = useState('')
  const [userInfo, setUserInfo] = useState({ name: '', email: '' })
  const [editingName, setEditingName] = useState(false)
  const [editingEmail, setEditingEmail] = useState(false)
  
  const [formData, setFormData] = useState({
    creatorName: '',
    creatorEmail: '',
    meetingTitle: '',
    meetingDescription: '',
    duration: '30'
  })

  // Check for OAuth callback on page load
  useEffect(() => {
    setMounted(true)
    
    const params = new URLSearchParams(window.location.search)
    const creatorConnected = params.get('creator_connected')
    const email = params.get('email')
    const name = params.get('name')
    
    if (creatorConnected && email) {
      // Restore form data from session if exists
      const savedData = sessionStorage.getItem('creatorFormData')
      if (savedData) {
        setFormData(JSON.parse(savedData))
        sessionStorage.removeItem('creatorFormData')
      }
      
      setCalendarConnected(true)
      setConnectedProvider(creatorConnected)
      const userName = decodeURIComponent(name || email.split('@')[0])
      setUserInfo({ name: userName, email })
      
      // Auto-populate form fields
      setFormData(prev => ({
        ...prev,
        creatorName: userName,
        creatorEmail: email
      }))
      
      setStep(2) // Move to meeting creation
      
      // Clean up URL
      window.history.replaceState({}, '', '/create')
    }
  }, [])

  if (!mounted) {
    return null // Prevent hydration issues
  }

  const connectCreatorCalendar = async (provider: 'google' | 'microsoft') => {
    setConnecting(true)
    
    // Redirect to OAuth flow for creator - let OAuth provide the real user info
    window.location.href = `/api/auth/${provider}/creator`
  }

  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          calendarProvider: connectedProvider
        })
      })
      
      const data = await response.json()
      
      if (data.shareLink) {
        setShareLink(data.shareLink)
        setStep(3)
      }
    } catch (error) {
      console.error('Error creating booking:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendInviteEmail = async () => {
    const emailInput = document.getElementById('recipientEmail') as HTMLInputElement
    const recipientEmail = emailInput?.value
    
    if (!recipientEmail) {
      alert('Please enter an email address')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch('/api/bookings/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareLink,
          recipientEmail,
          creatorName: formData.creatorName,
          meetingTitle: formData.meetingTitle
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('📧 Meeting invite sent successfully!')
        emailInput.value = ''
      } else {
        alert('Failed to send email. You can still share the link manually.')
      }
    } catch (error) {
      console.error('Error sending invite:', error)
      alert('Failed to send email. You can still share the link manually.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const disconnectCalendar = () => {
    setCalendarConnected(false)
    setConnectedProvider('')
    setUserInfo({ name: '', email: '' })
    setStep(1)
  }

  const durations = [
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '45', label: '45 minutes' },
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200 sticky top-0 bg-white z-50">
        <div className="container-width py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-semibold">Syncthesis</span>
          </Link>
          <Link href="/" className="flex items-center text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </nav>

      <div className="container-width py-12">
        <div className="max-w-2xl mx-auto">
          {/* Progress Indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                <Calendar className="h-5 w-5" />
              </div>
              <div className={`w-16 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                <FileText className="h-5 w-5" />
              </div>
              <div className={`w-16 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                <Zap className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="text-center mb-2">
            <div className="text-sm text-slate-600">
              {step === 1 && "Step 1 of 3: Connect Calendar"}
              {step === 2 && "Step 2 of 3: Meeting Details"}
              {step === 3 && "Step 3 of 3: Schedule Together"}
            </div>
          </div>

          {step === 1 ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">Connect Your Calendar First</h1>
                <p className="text-slate-600">We'll analyze your calendar to find perfect meeting times and auto-fill your details</p>
              </div>

              <div className="card">
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-lg p-6 text-center">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                        <Zap className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-blue-800">🚀 Syncthesis Advantage</h3>
                    <p className="text-blue-700 text-sm mb-4">
                      Connect your calendar first so we can auto-fill your details and prepare for 
                      intelligent mutual scheduling with your meeting partner.
                    </p>
                    <div className="bg-yellow-100 rounded p-3 text-yellow-800 text-xs">
                      <strong>Unlike Calendly:</strong> We analyze BOTH calendars for true mutual availability!
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-center">Choose Your Calendar</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <button
                        onClick={() => connectCreatorCalendar('google')}
                        disabled={connecting}
                        className="btn-secondary flex items-center justify-center py-6 hover:border-blue-400"
                      >
                        <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <div className="text-left">
                          <div className="font-medium">Google Calendar</div>
                          <div className="text-xs text-slate-600">Most popular choice</div>
                        </div>
                      </button>
                      <button
                        onClick={() => connectCreatorCalendar('microsoft')}
                        disabled={connecting}
                        className="btn-secondary flex items-center justify-center py-6 hover:border-blue-400"
                      >
                        <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                          <path fill="#00A4EF" d="M11.5 11.5v-11h-11v11h11z"/>
                          <path fill="#FFB900" d="M24 11.5v-11h-11v11h11z"/>
                          <path fill="#00D924" d="M11.5 24v-11h-11v11h11z"/>
                          <path fill="#FF3E00" d="M24 24v-11h-11v11h11z"/>
                        </svg>
                        <div className="text-left">
                          <div className="font-medium">Microsoft Outlook</div>
                          <div className="text-xs text-slate-600">Enterprise favorite</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-slate-500">
                      🔒 Your calendar data is never stored. We only analyze availability in real-time.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : step === 2 ? (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">Create Your Meeting Request</h1>
                <p className="text-slate-600">Details auto-filled from your {connectedProvider} calendar</p>
              </div>

              {/* Connected Calendar Info */}
              <div className="bg-green-50 rounded-lg p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-green-800">Calendar Connected</div>
                    <div className="text-xs text-green-700">{userInfo.email} • {connectedProvider}</div>
                  </div>
                </div>
                <button
                  onClick={disconnectCalendar}
                  className="text-green-700 hover:text-green-800 text-sm flex items-center"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Switch
                </button>
              </div>

              <form onSubmit={handleMeetingSubmit} className="card">
                <div className="space-y-6">
                  {/* Auto-populated Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <User className="h-5 w-5 text-blue-600 mr-2" />
                      Your Information
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Auto-filled</span>
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Your Name *</label>
                        <div className="relative">
                          {editingName ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={formData.creatorName}
                                onChange={(e) => setFormData({...formData, creatorName: e.target.value})}
                                className="input-field flex-1"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => setEditingName(false)}
                                className="btn-secondary px-3"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={formData.creatorName}
                                readOnly
                                className="input-field flex-1 bg-slate-50"
                              />
                              <button
                                type="button"
                                onClick={() => setEditingName(true)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Your Email *</label>
                        <div className="relative">
                          {editingEmail ? (
                            <div className="flex gap-2">
                              <input
                                type="email"
                                value={formData.creatorEmail}
                                onChange={(e) => setFormData({...formData, creatorEmail: e.target.value})}
                                className="input-field flex-1"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => setEditingEmail(false)}
                                className="btn-secondary px-3"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                type="email"
                                value={formData.creatorEmail}
                                readOnly
                                className="input-field flex-1 bg-slate-50"
                              />
                              <button
                                type="button"
                                onClick={() => setEditingEmail(true)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Meeting Details */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <FileText className="h-5 w-5 text-blue-600 mr-2" />
                      Meeting Details
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Meeting Title *</label>
                        <input
                          type="text"
                          required
                          value={formData.meetingTitle}
                          onChange={(e) => setFormData({...formData, meetingTitle: e.target.value})}
                          className="input-field"
                          placeholder="Project Discussion"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                        <textarea
                          value={formData.meetingDescription}
                          onChange={(e) => setFormData({...formData, meetingDescription: e.target.value})}
                          className="input-field min-h-[100px]"
                          placeholder="Let's discuss the Q4 roadmap and priorities..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Duration</label>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                          {durations.map((duration) => (
                            <button
                              key={duration.value}
                              type="button"
                              onClick={() => setFormData({...formData, duration: duration.value})}
                              className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                                formData.duration === duration.value
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {duration.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full"
                  >
                    {loading ? 'Creating...' : 'Schedule Together'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mb-4">🚀 Smart Meeting Link Created!</h1>
                <p className="text-slate-600">Share this link - when they connect their calendar, our AI will find perfect mutual times</p>
              </div>

              <div className="card">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Send Meeting Invite</label>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Who should receive the invite? *</label>
                        <input
                          type="email"
                          placeholder="colleague@company.com"
                          className="input-field"
                          id="recipientEmail"
                        />
                      </div>
                      <button
                        onClick={sendInviteEmail}
                        className="btn-primary w-full"
                        disabled={loading}
                      >
                        {loading ? 'Sending...' : '📧 Send Meeting Invite'}
                      </button>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-200">
                      <label className="block text-sm font-medium mb-2">Or share manually:</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={shareLink}
                          className="input-field flex-1 text-sm"
                        />
                        <button
                          onClick={copyToClipboard}
                          className="btn-secondary flex items-center"
                        >
                          {copied ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-2 flex items-center text-blue-800">
                      <Zap className="h-5 w-5 text-blue-600 mr-2" />
                      🚀 Syncthesis Magic
                    </h3>
                    <ol className="space-y-2 text-sm text-blue-800">
                      <li>1. <strong>Send this link</strong> to your meeting partner</li>
                      <li>2. <strong>They connect their calendar</strong> (30 seconds)</li>
                      <li>3. <strong>AI analyzes BOTH calendars</strong> to find perfect mutual times</li>
                      <li>4. <strong>They pick a time</strong> that works for both of you</li>
                      <li>5. <strong>Meeting automatically added</strong> to both calendars - DONE!</li>
                    </ol>
                    <div className="mt-3 p-2 bg-yellow-100 rounded border-l-4 border-yellow-400">
                      <p className="text-yellow-800 text-xs">
                        <strong>Unlike Calendly:</strong> No one-sided availability slots. True mutual scheduling!
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setStep(1)
                        setCalendarConnected(false)
                        setFormData({
                          creatorName: '',
                          creatorEmail: '',
                          meetingTitle: '',
                          meetingDescription: '',
                          duration: '30'
                        })
                      }}
                      className="btn-secondary flex-1"
                    >
                      Create Another
                    </button>
                    <Link href="/" className="btn-primary flex-1 text-center">
                      Back to Home
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}