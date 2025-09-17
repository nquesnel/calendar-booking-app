'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Calendar, 
  Video, 
  Phone, 
  MapPin, 
  Settings, 
  Copy,
  CheckCircle
} from 'lucide-react'

interface FormData {
  inviteeEmail: string
  inviteeName: string
  meetingTitle: string
  duration: number
  meetingType: string
  meetingLink: string
  phoneNumber: string
  address: string
  meetingNotes: string
  personalMessage: string
}

export default function CleanCreatePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [copied, setCopied] = useState(false)
  
  const [formData, setFormData] = useState<FormData>({
    inviteeEmail: '',
    inviteeName: '',
    meetingTitle: '',
    duration: 30,
    meetingType: 'video',
    meetingLink: '',
    phoneNumber: '',
    address: '',
    meetingNotes: '',
    personalMessage: ''
  })

  // Check for OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const creatorConnected = urlParams.get('creator_connected')
    
    if (creatorConnected) {
      processPendingMeeting()
    }
  }, [])

  const processPendingMeeting = async () => {
    try {
      const pendingData = sessionStorage.getItem('pendingMeeting')
      if (!pendingData) {
        alert('Meeting session expired. Please create your meeting again.')
        setStep(1)
        return
      }

      const meetingData = JSON.parse(pendingData)
      
      // Check expiration (24 hours)
      if (Date.now() > meetingData.expiresAt) {
        sessionStorage.removeItem('pendingMeeting')
        alert('Meeting session expired. Please create your meeting again.')
        setStep(1)
        return
      }

      // Create meeting with authenticated user
      await createMeeting(meetingData)
      sessionStorage.removeItem('pendingMeeting')
    } catch (error) {
      console.error('Error processing pending meeting:', error)
      alert('Error processing meeting. Please try again.')
      setStep(1)
    }
  }

  const handleStepOne = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.inviteeEmail || !formData.meetingTitle) {
      alert('Please fill in both email address and meeting title.')
      return
    }
    
    // Store in session with 24hr expiration
    const meetingData = {
      ...formData,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000)
    }
    
    sessionStorage.setItem('pendingMeeting', JSON.stringify(meetingData))
    setStep(2)
  }

  const createMeeting = async (meetingData: any) => {
    setLoading(true)
    
    try {
      // Get authenticated user
      const profileResponse = await fetch('/api/profile')
      const profileData = await profileResponse.json()
      
      if (!profileData.profile) {
        throw new Error('User not authenticated')
      }

      // Create meeting
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorName: profileData.profile.name,
          creatorEmail: profileData.profile.email,
          meetingTitle: meetingData.meetingTitle,
          duration: meetingData.duration,
          meetingType: meetingData.meetingType,
          meetingLink: meetingData.meetingLink,
          phoneNumber: meetingData.phoneNumber,
          address: meetingData.address,
          meetingNotes: meetingData.meetingNotes,
          inviteeEmail: meetingData.inviteeEmail,
          inviteeName: meetingData.inviteeName,
          personalMessage: meetingData.personalMessage,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Send email invite
        if (meetingData.inviteeEmail && data.shareLink) {
          try {
            const inviteResponse = await fetch('/api/bookings/send-invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                shareLink: data.shareLink,
                recipientEmail: meetingData.inviteeEmail,
                recipientName: meetingData.inviteeName,
                message: meetingData.personalMessage,
                creatorName: profileData.profile.name,
                meetingTitle: meetingData.meetingTitle
              })
            })
            
            if (inviteResponse.ok) {
              console.log('📧 Email invite sent successfully')
            }
          } catch (error) {
            console.error('Error sending invite:', error)
          }
        }
        
        setShareLink(data.shareLink)
        setShowSuccess(true)
      } else {
        throw new Error('Failed to create meeting')
      }
    } catch (error) {
      console.error('Error creating meeting:', error)
      alert('Failed to create meeting. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const resetForm = () => {
    setShowSuccess(false)
    setShareLink('')
    setCopied(false)
    setStep(1)
    setFormData({
      inviteeEmail: '',
      inviteeName: '',
      meetingTitle: '',
      duration: 30,
      meetingType: 'video',
      meetingLink: '',
      phoneNumber: '',
      address: '',
      meetingNotes: '',
      personalMessage: ''
    })
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className={`${step === 1 ? 'bg-white border-b border-slate-200' : 'bg-white bg-opacity-90 backdrop-blur-sm'} px-4 py-3 relative z-50`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className={`text-xl font-bold ${step === 1 ? 'text-slate-900' : 'text-slate-900'}`}>
            Syncthesis
          </Link>
        </div>
      </nav>

      {!showSuccess ? (
        step === 1 ? (
          /* STEP 1: Meeting Details */
          <div className="bg-slate-50 py-12">
            <div className="max-w-2xl mx-auto px-6">
              {/* Progress Indicator */}
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-blue-600">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">1</div>
                    <span className="font-medium">Create Meeting</span>
                  </div>
                  <div className="w-8 h-0.5 bg-slate-300"></div>
                  <div className="flex items-center space-x-2 text-slate-400">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-medium">2</div>
                    <span className="font-medium">Connect Calendar</span>
                  </div>
                </div>
              </div>

              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Meeting Request</h1>
                <p className="text-slate-600">Set up your meeting details</p>
              </div>

              <form onSubmit={handleStepOne} className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <div className="space-y-6">
                    {/* Email */}
                    <div>
                      <label className="block text-base font-semibold text-slate-900 mb-2">
                        Invitee Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="colleague@company.com"
                        value={formData.inviteeEmail}
                        onChange={(e) => setFormData({ ...formData, inviteeEmail: e.target.value })}
                        className="w-full p-3 text-base border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                      />
                      {formData.inviteeEmail && (
                        <input
                          type="text"
                          placeholder="Their name (optional)"
                          value={formData.inviteeName}
                          onChange={(e) => setFormData({ ...formData, inviteeName: e.target.value })}
                          className="w-full mt-2 p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-400"
                        />
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-base font-semibold text-slate-900 mb-2">
                        Meeting Title *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Strategy Discussion, 1:1 Check-in, Team Sync..."
                        value={formData.meetingTitle}
                        onChange={(e) => setFormData({ ...formData, meetingTitle: e.target.value })}
                        className="w-full p-3 text-base border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Duration
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 30, label: '30 min' },
                          { value: 60, label: '1 hour' },
                          { value: 0, label: 'Custom' }
                        ].map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              if (value === 0) {
                                const custom = prompt('Enter duration in minutes:', '45')
                                if (custom && !isNaN(Number(custom))) {
                                  setFormData({ ...formData, duration: Number(custom) })
                                }
                              } else {
                                setFormData({ ...formData, duration: value })
                              }
                            }}
                            className={`p-3 text-sm font-medium rounded-lg transition-all ${
                              formData.duration === value || (value === 0 && ![30, 60].includes(formData.duration))
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {value === 0 && ![30, 60].includes(formData.duration) ? `${formData.duration}m` : label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Meeting Type */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Meeting Type
                      </label>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { value: 'video', label: 'Video', icon: Video },
                          { value: 'phone', label: 'Phone', icon: Phone },
                          { value: 'in-person', label: 'In-Person', icon: MapPin },
                          { value: 'custom', label: 'Custom', icon: Settings }
                        ].map(({ value, label, icon: Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setFormData({ ...formData, meetingType: value })}
                            className={`p-3 text-sm font-medium rounded-lg transition-all flex flex-col items-center space-y-1 ${
                              formData.meetingType === value
                                ? 'bg-blue-500 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Meeting Type Specific Fields */}
                    {formData.meetingType === 'video' && (
                      <input
                        type="url"
                        placeholder="https://zoom.us/j/your-meeting-id"
                        value={formData.meetingLink}
                        onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                        className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-400"
                      />
                    )}
                    
                    {formData.meetingType === 'phone' && (
                      <input
                        type="tel"
                        placeholder="+1 (555) 123-4567 or 'I'll call you'"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-400"
                      />
                    )}
                    
                    {formData.meetingType === 'in-person' && (
                      <input
                        type="text"
                        placeholder="123 Main St, City, State"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-400"
                      />
                    )}
                    
                    {formData.meetingType === 'custom' && (
                      <input
                        type="text"
                        placeholder="Custom meeting instructions..."
                        value={formData.meetingNotes}
                        onChange={(e) => setFormData({ ...formData, meetingNotes: e.target.value })}
                        className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-400"
                      />
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl text-base transition-all shadow-lg hover:shadow-xl"
                >
                  {loading ? 'Saving Details...' : 'Continue to Step 2'}
                </button>

                <div className="text-center">
                  <p className="text-sm font-medium">
                    {!formData.inviteeEmail || !formData.meetingTitle ? (
                      <span className="text-slate-500">Email and title required</span>
                    ) : (
                      <span className="text-green-600 flex items-center justify-center space-x-1">
                        <CheckCircle className="h-4 w-4" />
                        <span>Ready to continue!</span>
                      </span>
                    )}
                  </p>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* STEP 2: Calendar Connection */
          <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-700 relative">
            {/* Floating shapes */}
            <div className="absolute top-20 left-10 w-20 h-20 bg-white bg-opacity-10 rounded-full blur-xl animate-bounce"></div>
            <div className="absolute bottom-32 right-16 w-32 h-32 bg-blue-300 bg-opacity-20 rounded-full blur-2xl animate-pulse"></div>
            
            <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
              {/* Header */}
              <div className="text-center mb-12">
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <h1 className="text-4xl font-bold text-white">Connect Your Calendar Instantly</h1>
                  <div className="bg-gradient-to-r from-pink-500 to-yellow-400 text-white text-sm font-bold px-4 py-2 rounded-full shadow-xl animate-pulse">
                    ✨ AI-Powered
                  </div>
                </div>
                <p className="text-xl text-white text-opacity-80">15-second connection, lifetime of effortless meetings</p>
              </div>

              {/* Calendar Buttons - Side by Side */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-16">
                <div className="relative">
                  <div className="absolute -top-3 -right-6 z-20">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      Connect in 15 seconds
                    </div>
                  </div>
                  <button
                    onClick={() => window.location.href = '/api/auth/google/creator'}
                    className="group relative bg-white bg-opacity-95 backdrop-blur-lg rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-4 border border-white border-opacity-20 w-80 min-w-[340px]"
                    style={{
                      transform: 'translateY(0)',
                      boxShadow: '0 10px 30px rgba(66,133,244,0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'
                      e.currentTarget.style.boxShadow = '0 20px 50px rgba(66,133,244,0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)'
                      e.currentTarget.style.boxShadow = '0 10px 30px rgba(66,133,244,0.3)'
                    }}
                  >
                    <svg className="w-10 h-10 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <div className="text-left flex-1">
                      <div className="text-xl font-bold text-slate-900">Google Calendar</div>
                    </div>
                    <svg className="w-6 h-6 text-blue-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute -top-3 -right-6 z-20">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      Enterprise-ready
                    </div>
                  </div>
                  <button
                    onClick={() => window.location.href = '/api/auth/microsoft/creator'}
                    className="group relative bg-white bg-opacity-95 backdrop-blur-lg rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center space-x-4 border border-white border-opacity-20 w-80 min-w-[340px]"
                    style={{
                      transform: 'translateY(0)',
                      boxShadow: '0 10px 30px rgba(255,120,0,0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'
                      e.currentTarget.style.boxShadow = '0 20px 50px rgba(255,120,0,0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)'
                      e.currentTarget.style.boxShadow = '0 10px 30px rgba(255,120,0,0.3)'
                    }}
                  >
                    <svg className="w-10 h-10 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                      <path fill="#00A4EF" d="M11.5 11.5v-11h-11v11h11z"/>
                      <path fill="#FFB900" d="M24 11.5v-11h-11v11h11z"/>
                      <path fill="#00D924" d="M11.5 24v-11h-11v11h11z"/>
                      <path fill="#FF3E00" d="M24 24v-11h-11v11h11z"/>
                    </svg>
                    <div className="text-left flex-1">
                      <div className="text-xl font-bold text-slate-900">Microsoft Outlook</div>
                    </div>
                    <svg className="w-6 h-6 text-orange-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Meeting Preview */}
              <div className="max-w-2xl mx-auto">
                <div className="bg-white bg-opacity-15 backdrop-blur-xl rounded-3xl p-8 border border-white border-opacity-30 shadow-2xl">
                  <h3 className="text-2xl font-bold text-white mb-6 text-center">Meeting Preview</h3>
                  <div className="space-y-4 text-white">
                    <div className="flex justify-between py-2 border-b border-white border-opacity-20">
                      <strong>To:</strong>
                      <span>{formData.inviteeEmail}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white border-opacity-20">
                      <strong>Title:</strong>
                      <span>{formData.meetingTitle}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white border-opacity-20">
                      <strong>Duration:</strong>
                      <span>{formData.duration} minutes</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <strong>Type:</strong>
                      <span>{formData.meetingType.charAt(0).toUpperCase() + formData.meetingType.slice(1)}</span>
                    </div>
                    {formData.meetingType === 'video' && (
                      <div className="flex justify-between py-2">
                        <strong>Link:</strong>
                        <span>{formData.meetingLink || 'To be provided'}</span>
                      </div>
                    )}
                    {formData.meetingType === 'phone' && (
                      <div className="flex justify-between py-2">
                        <strong>Phone:</strong>
                        <span>{formData.phoneNumber || 'To be provided'}</span>
                      </div>
                    )}
                    {formData.meetingType === 'in-person' && (
                      <div className="flex justify-between py-2">
                        <strong>Location:</strong>
                        <span>{formData.address || 'To be provided'}</span>
                      </div>
                    )}
                    {formData.meetingType === 'custom' && (
                      <div className="flex justify-between py-2">
                        <strong>Details:</strong>
                        <span>{formData.meetingNotes || 'To be provided'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        /* Success Screen */
        <div className="bg-slate-50 py-12">
          <div className="max-w-2xl mx-auto px-6">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-green-200 text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Meeting Invitation Sent! ✨</h2>
                <p className="text-slate-600">
                  Your recipient will get an email and can book a time that works for both of you.
                </p>
              </div>
              
              <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-2">Share Link (backup):</p>
                <div className="flex items-center space-x-3">
                  <code className="flex-1 text-xs bg-white p-3 rounded border break-all">{shareLink}</code>
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <Copy className="h-4 w-4" />
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              
              <div className="flex gap-4 justify-center">
                <button
                  onClick={resetForm}
                  className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Create Another
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
                >
                  View Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}