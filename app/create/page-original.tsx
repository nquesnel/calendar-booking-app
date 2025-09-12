'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, ArrowLeft, Clock, Mail, User, FileText, Copy, Check, Zap, Video, Phone, MapPin, Settings, Users, RefreshCw, ChevronDown, ChevronUp, X, CheckCircle, Crown } from 'lucide-react'
import { getTierFeatures, hasAccess, canCreateGroupMeeting } from '@/lib/tiers'

interface UserProfile {
  plan: string
  defaultVideoLink?: string
  defaultPhoneNumber?: string
  defaultAddress?: string
  defaultMeetingNotes?: string
}

export default function EnhancedCreateBooking() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true) // Add initial loading state
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [step, setStep] = useState(1) // 1: Connect Calendar, 2: Create Meeting, 3: Send Invite, 4: Share Link
  const [shareLink, setShareLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [connectedProvider, setConnectedProvider] = useState('')
  const [userInfo, setUserInfo] = useState({ name: '', email: '' })
  const [profile, setProfile] = useState<UserProfile | null>(null)
  
  const [formData, setFormData] = useState({
    creatorName: '',
    creatorEmail: '',
    meetingTitle: '',
    meetingDescription: '',
    duration: '30',
    // Enhanced meeting location fields
    meetingType: 'video',
    meetingLink: '',
    phoneNumber: '',
    address: '',
    meetingNotes: '',
    // Group meeting fields
    isGroupMeeting: false,
    maxParticipants: 2,
    participantEmails: [] as string[],
    // Recurring session fields
    isRecurring: false,
    recurringPattern: 'weekly',
    // Organizer scheduling preferences
    timeUrgency: 'flexible',
    roughTimeframe: 'no_preference',
    timeOfDayPref: 'no_preference',
    dayPreferences: {} as Record<string, 'prefer' | 'avoid' | 'neutral'>,
    // Group meeting deadline settings
    deadlineHours: 48,
    autoSelectAtDeadline: false,
    // Invitee information (for 1-on-1 meetings)
    inviteeName: '',
    inviteeEmail: '',
    personalMessage: '',
    // Follow-up settings
    enableFollowUps: true
  })

  // Section collapse state
  const [advancedOptionsExpanded, setAdvancedOptionsExpanded] = useState(false)
  const [schedulingPrefsExpanded, setSchedulingPrefsExpanded] = useState(false)

  // Helper function for day preference changes
  const handleDayPreference = (dayValue: string) => {
    const current = formData.dayPreferences[dayValue] || 'neutral'
    let next: 'prefer' | 'avoid' | 'neutral'
    
    if (current === 'neutral') next = 'prefer'
    else if (current === 'prefer') next = 'avoid' 
    else next = 'neutral'
    
    setFormData({
      ...formData,
      dayPreferences: {
        ...formData.dayPreferences,
        [dayValue]: next
      }
    })
  }

  // Form validation for preference conflicts
  const getValidationWarnings = () => {
    const warnings: string[] = []
    
    if (formData.timeUrgency === 'urgent') {
      const weekdays = ['1', '2', '3', '4', '5']
      const availableWeekdays = weekdays.filter(day => 
        formData.dayPreferences[day] !== 'avoid'
      )
      
      if (availableWeekdays.length === 0) {
        warnings.push('Urgent timing requires at least one weekday available')
      }
    }
    
    return warnings
  }

  // Load user profile and defaults
  useEffect(() => {
    const initializeApp = async () => {
      await checkAuthStatus()
      await loadProfile()
      await checkExistingCalendarConnection()
      setInitialLoading(false) // Set initial loading to false after both complete
    }
    initializeApp()
  }, [])
  
  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setIsLoggedIn(!!data.profile)
      } else {
        setIsLoggedIn(false)
      }
    } catch (error) {
      setIsLoggedIn(false)
    }
  }

  const checkExistingCalendarConnection = async () => {
    try {
      const response = await fetch('/api/profile')
      const data = await response.json()
      
      if (data.profile && data.calendarConnected) {
        // User already has calendar connected, skip to step 2
        setCalendarConnected(true)
        setConnectedProvider(data.calendarProvider || 'google')
        setUserInfo({ 
          name: data.profile.name, 
          email: data.profile.email 
        })
        setFormData(prev => ({
          ...prev,
          creatorName: data.profile.name,
          creatorEmail: data.profile.email
        }))
        setStep(2)
      }
    } catch (error) {
      console.error('Error checking calendar connection:', error)
    }
  }

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      const data = await response.json()
      
      if (data.profile) {
        setProfile(data.profile)
        
        // Auto-populate with profile defaults if available
        setFormData(prev => ({
          ...prev,
          meetingLink: data.profile.defaultVideoLink || '',
          phoneNumber: data.profile.defaultPhoneNumber || '',
          address: data.profile.defaultAddress || '',
          meetingNotes: data.profile.defaultMeetingNotes || ''
        }))
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  // Check for OAuth callback on page load
  useEffect(() => {
    setMounted(true)
    
    const params = new URLSearchParams(window.location.search)
    const creatorConnected = params.get('creator_connected')
    const email = params.get('email')
    const name = params.get('name')
    
    if (creatorConnected && email) {
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

  if (!mounted || initialLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  const connectCreatorCalendar = async (provider: 'google' | 'microsoft') => {
    setConnecting(true)
    window.location.href = `/api/auth/${provider}/creator`
  }

  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Convert dayPreferences to backend format
    const preferredDays = Object.entries(formData.dayPreferences)
      .filter(([_, pref]) => pref === 'prefer')
      .map(([day, _]) => day)
      .join(',')
      
    const avoidDays = Object.entries(formData.dayPreferences)
      .filter(([_, pref]) => pref === 'avoid')
      .map(([day, _]) => day)
      .join(',')
    
    try {
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          preferredDays,
          avoidDays,
          calendarProvider: connectedProvider
        })
      })
      
      const data = await response.json()
      
      if (data.shareLink) {
        setShareLink(data.shareLink)
        
        // For 1-on-1 meetings, automatically send invite if email provided
        if (!formData.isGroupMeeting && formData.inviteeEmail) {
          try {
            const inviteResponse = await fetch('/api/bookings/send-invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                shareLink: data.shareLink,
                recipientEmail: formData.inviteeEmail,
                recipientName: formData.inviteeName,
                message: formData.personalMessage,
                creatorName: formData.creatorName,
                meetingTitle: formData.meetingTitle
              })
            })
            
            if (inviteResponse.ok) {
              console.log('📧 Email invite sent successfully')
            }
          } catch (error) {
            console.error('Error sending invite:', error)
            // Don't fail the flow if email sending fails
          }
        }
        
        setStep(3) // Go to final step
      }
    } catch (error) {
      console.error('Error creating booking:', error)
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

  const tierFeatures = profile ? getTierFeatures(profile.plan as any) : null
  const canUseGroupMeetings = profile ? hasAccess(profile.plan as any, 'groupRescheduling') : false
  const canUseRecurring = profile ? hasAccess(profile.plan as any, 'recurringSessions') : false

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200 sticky top-0 bg-white z-50">
        <div className="container-width py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-semibold">CalendarSync</span>
          </Link>
          <div className="flex items-center space-x-3">
            {isLoggedIn && (
              <Link href="/dashboard" className="btn-secondary flex items-center whitespace-nowrap">
                <Calendar className="h-4 w-4 mr-1" />
                Dashboard
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="container-width py-12">
        <div className="max-w-3xl mx-auto">
          {/* Step 1: Connect Calendar */}
          {step === 1 && (
            <div className="card text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Create Meeting Request</h1>
                <p className="text-slate-600">
                  Connect your calendar to enable smart scheduling with mutual availability analysis
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
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
                    <div className="text-xs text-slate-600">Enterprise option</div>
                  </div>
                </button>
              </div>

              <div className="text-center">
                <p className="text-xs text-slate-500">
                  🔒 Your calendar data is secure and only used for scheduling analysis
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Create Meeting */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setStep(1)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold">Create Your Meeting Request</h1>
                  <p className="text-slate-600">Set up the details for your meeting</p>
                </div>
              </div>

              <form onSubmit={handleMeetingSubmit} className="space-y-6">
                {/* Invitee Information - For 1-on-1 meetings */}
                {!formData.isGroupMeeting && (
                  <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Invitee Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Invitee Name (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="John Doe"
                          value={formData.inviteeName}
                          onChange={(e) => setFormData({ ...formData, inviteeName: e.target.value })}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Invitee Email *
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="recipient@example.com"
                          value={formData.inviteeEmail}
                          onChange={(e) => setFormData({ ...formData, inviteeEmail: e.target.value })}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Personal Message (Optional)
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Add a personal note to your meeting invite..."
                          value={formData.personalMessage}
                          onChange={(e) => setFormData({ ...formData, personalMessage: e.target.value })}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      {/* Follow-up Settings */}
                      <div>
                        <label className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg hover:border-blue-400 transition-colors">
                          <input
                            type="checkbox"
                            checked={formData.enableFollowUps}
                            onChange={(e) => setFormData({ ...formData, enableFollowUps: e.target.checked })}
                            disabled={!tierFeatures?.automatedFollowUps}
                            className="h-4 w-4"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-sm">📧 Send follow-up reminders if no response</span>
                              {!tierFeatures?.automatedFollowUps && (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                                  Professional Feature
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-600 mt-1">
                              {tierFeatures?.automatedFollowUps ? (
                                tierFeatures.maxFollowUps === 1 ? 
                                  'Sends 1 follow-up after 48 hours if recipient doesn\'t schedule, connect, or opt out' :
                                  `Sends up to ${tierFeatures.maxFollowUps} follow-ups at customizable intervals if recipient doesn\'t schedule, connect, or opt out`
                              ) : (
                                'Upgrade to Professional ($15/month) to enable automated follow-up reminders'
                              )}
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Meeting Details */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Meeting Details</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Meeting Title *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Strategy Discussion, 1:1 Check-in"
                        value={formData.meetingTitle}
                        onChange={(e) => setFormData({ ...formData, meetingTitle: e.target.value })}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Description (Optional)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Add agenda, context, or any preparation notes..."
                        value={formData.meetingDescription}
                        onChange={(e) => setFormData({ ...formData, meetingDescription: e.target.value })}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Duration
                      </label>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {[
                          { value: '15', label: '15 min' },
                          { value: '30', label: '30 min' },
                          { value: '45', label: '45 min' },
                          { value: '60', label: '1 hour' },
                          { value: '90', label: '1.5 hours' },
                          { value: '120', label: '2 hours' }
                        ].map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setFormData({ ...formData, duration: value })}
                            className={`p-3 border-2 rounded-lg transition-all text-sm font-medium ${
                              formData.duration === value
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-300 hover:border-slate-400'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meeting Location */}
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4">Meeting Location</h3>
                  
                  <div className="space-y-4">
                    {/* Meeting Type Selector */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Meeting Type
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                          { value: 'video', label: 'Video Call', icon: Video },
                          { value: 'phone', label: 'Phone Call', icon: Phone },
                          { value: 'in-person', label: 'In-Person', icon: MapPin },
                          { value: 'custom', label: 'Custom', icon: Settings }
                        ].map(({ value, label, icon: Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setFormData({ ...formData, meetingType: value })}
                            className={`p-3 border-2 rounded-lg transition-all text-sm font-medium flex flex-col items-center space-y-1 ${
                              formData.meetingType === value
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-300 hover:border-slate-400'
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Location-specific fields */}
                    {formData.meetingType === 'video' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Video Meeting Link
                        </label>
                        <input
                          type="url"
                          placeholder="https://zoom.us/j/your-meeting-id or https://meet.google.com/your-link"
                          value={formData.meetingLink}
                          onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {profile?.defaultVideoLink && (
                          <p className="text-xs text-slate-500 mt-1">
                            💡 Auto-populated from your profile defaults
                          </p>
                        )}
                      </div>
                    )}

                    {formData.meetingType === 'phone' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          placeholder="+1 (555) 123-4567 or 'I'll call you'"
                          value={formData.phoneNumber}
                          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}

                    {formData.meetingType === 'in-person' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Meeting Address
                        </label>
                        <input
                          type="text"
                          placeholder="123 Main St, City, State 12345"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}

                    {formData.meetingType === 'custom' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Custom Meeting Instructions
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Provide any custom meeting instructions or location details..."
                          value={formData.meetingNotes}
                          onChange={(e) => setFormData({ ...formData, meetingNotes: e.target.value })}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>


                {/* Scheduling Preferences - Collapsible */}
                <div className="card">
                  <button
                    type="button"
                    onClick={() => setSchedulingPrefsExpanded(!schedulingPrefsExpanded)}
                    className="w-full flex items-center justify-between p-0 bg-transparent border-0 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  >
                    <h3 className="text-lg font-semibold flex items-center">
                      <Zap className="h-5 w-5 mr-2" />
                      Scheduling Preferences <span className="text-sm font-normal text-slate-500"> (Optional)</span>
                    </h3>
                    {schedulingPrefsExpanded ? (
                      <ChevronUp className="h-5 w-5 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-500" />
                    )}
                  </button>
                  
                  <p className="text-sm text-slate-600 mt-1">
                    We will prioritize these preferences when suggesting times
                  </p>
                  
                  {schedulingPrefsExpanded && (
                    <div className="mt-6 space-y-6 animate-in slide-in-from-top-1 duration-200">
                      {/* Validation Warnings */}
                      {getValidationWarnings().length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <div className="text-amber-800 text-sm">
                            <strong>Scheduling Conflicts:</strong>
                            <ul className="mt-1 space-y-1">
                              {getValidationWarnings().map((warning, index) => (
                                <li key={index}>• {warning}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                      
                      {/* Free Tier Preferences */}
                      <div>
                        <h4 className="font-medium text-slate-900 mb-3">Basic Constraints</h4>
                        <div className="space-y-4">
                          {/* Time Urgency */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Time urgency
                            </label>
                            <div className="flex flex-wrap gap-3">
                              <label className="flex items-center touch-target">
                                <input
                                  type="radio"
                                  name="timeUrgency"
                                  value="urgent"
                                  checked={formData.timeUrgency === 'urgent'}
                                  onChange={(e) => setFormData({ ...formData, timeUrgency: e.target.value })}
                                  className="mr-2"
                                />
                                <span className="text-sm">🔥 Urgent (within 3 days)</span>
                              </label>
                              <label className="flex items-center touch-target">
                                <input
                                  type="radio"
                                  name="timeUrgency"
                                  value="flexible"
                                  checked={formData.timeUrgency === 'flexible'}
                                  onChange={(e) => setFormData({ ...formData, timeUrgency: e.target.value })}
                                  className="mr-2"
                                />
                                <span className="text-sm">📅 Flexible timing</span>
                              </label>
                            </div>
                          </div>

                          {/* Rough Timeframe */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Rough timeframe
                            </label>
                            <div className="flex flex-wrap gap-3">
                              <label className="flex items-center touch-target">
                                <input
                                  type="radio"
                                  name="roughTimeframe"
                                  value="this_week"
                                  checked={formData.roughTimeframe === 'this_week'}
                                  onChange={(e) => setFormData({ ...formData, roughTimeframe: e.target.value })}
                                  className="mr-2"
                                />
                                <span className="text-sm">This week</span>
                              </label>
                              <label className="flex items-center touch-target">
                                <input
                                  type="radio"
                                  name="roughTimeframe"
                                  value="next_week"
                                  checked={formData.roughTimeframe === 'next_week'}
                                  onChange={(e) => setFormData({ ...formData, roughTimeframe: e.target.value })}
                                  className="mr-2"
                                />
                                <span className="text-sm">Next week</span>
                              </label>
                              <label className="flex items-center touch-target">
                                <input
                                  type="radio"
                                  name="roughTimeframe"
                                  value="no_preference"
                                  checked={formData.roughTimeframe === 'no_preference'}
                                  onChange={(e) => setFormData({ ...formData, roughTimeframe: e.target.value })}
                                  className="mr-2"
                                />
                                <span className="text-sm">No preference</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Professional Tier Preferences */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-slate-900">Personal Optimization</h4>
                          {profile?.plan === 'free' && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                              Professional Feature
                            </span>
                          )}
                        </div>
                        
                        {profile?.plan === 'free' && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                            <p className="text-amber-800 text-sm">
                              Upgrade to Professional ($15/month) to unlock personal scheduling optimization
                            </p>
                          </div>
                        )}

                        <div className="space-y-4">
                          {/* Time of Day Preference */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Time of day preference
                            </label>
                            <div className="flex flex-wrap gap-3">
                              <label className="flex items-center touch-target">
                                <input
                                  type="radio"
                                  name="timeOfDayPref"
                                  value="morning"
                                  checked={formData.timeOfDayPref === 'morning'}
                                  onChange={(e) => setFormData({ ...formData, timeOfDayPref: e.target.value })}
                                  disabled={profile?.plan === 'free'}
                                  className="mr-2"
                                />
                                <span className="text-sm">🌅 Morning person</span>
                              </label>
                              <label className="flex items-center touch-target">
                                <input
                                  type="radio"
                                  name="timeOfDayPref"
                                  value="afternoon"
                                  checked={formData.timeOfDayPref === 'afternoon'}
                                  onChange={(e) => setFormData({ ...formData, timeOfDayPref: e.target.value })}
                                  disabled={profile?.plan === 'free'}
                                  className="mr-2"
                                />
                                <span className="text-sm">☀️ Afternoon person</span>
                              </label>
                              <label className="flex items-center touch-target">
                                <input
                                  type="radio"
                                  name="timeOfDayPref"
                                  value="no_preference"
                                  checked={formData.timeOfDayPref === 'no_preference'}
                                  onChange={(e) => setFormData({ ...formData, timeOfDayPref: e.target.value })}
                                  disabled={profile?.plan === 'free'}
                                  className="mr-2"
                                />
                                <span className="text-sm">No preference</span>
                              </label>
                            </div>
                          </div>

                          {/* Day Preferences - Three State Buttons */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">
                              Day Preferences
                            </label>
                            <p className="text-xs text-slate-500 mb-3">
                              Click each day to cycle through: Neutral → Prefer → Avoid
                            </p>
                            <div className="grid grid-cols-7 gap-2">
                              {[
                                { value: '1', label: 'Mon' },
                                { value: '2', label: 'Tue' },
                                { value: '3', label: 'Wed' },
                                { value: '4', label: 'Thu' },
                                { value: '5', label: 'Fri' },
                                { value: '6', label: 'Sat' },
                                { value: '7', label: 'Sun' }
                              ].map((day) => {
                                const pref = formData.dayPreferences[day.value] || 'neutral'
                                const isDisabled = profile?.plan === 'free'
                                
                                return (
                                  <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => !isDisabled && handleDayPreference(day.value)}
                                    disabled={isDisabled}
                                    className={`
                                      p-2 rounded-lg border-2 transition-all touch-target text-xs font-medium
                                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                                      ${pref === 'prefer' ? 'border-green-500 bg-green-100 text-green-800' : 
                                        pref === 'avoid' ? 'border-red-500 bg-red-100 text-red-800' :
                                        'border-slate-300 bg-white text-slate-600 hover:border-slate-400'}
                                    `}
                                  >
                                    <div className="flex flex-col items-center space-y-1">
                                      <div className="h-4 w-4 flex items-center justify-center">
                                        {pref === 'prefer' && <CheckCircle className="h-3 w-3" />}
                                        {pref === 'avoid' && <X className="h-3 w-3" />}
                                        {pref === 'neutral' && <div className="h-2 w-2 rounded-full bg-slate-400"></div>}
                                      </div>
                                      <span>{day.label}</span>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                              💡 More preferences = better suggestions, but none are required
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Premium Features - Collapsible */}
                <div className="card">
                  <button
                    type="button"
                    onClick={() => setAdvancedOptionsExpanded(!advancedOptionsExpanded)}
                    className="w-full flex items-center justify-between p-0 bg-transparent border-0 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  >
                    <h3 className="text-lg font-semibold flex items-center">
                      <Crown className="h-5 w-5 mr-2 text-purple-600" />
                      Premium Features
                    </h3>
                    {advancedOptionsExpanded ? (
                      <ChevronUp className="h-5 w-5 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-500" />
                    )}
                  </button>
                  
                  {advancedOptionsExpanded && (
                    <div className="mt-6 space-y-4 animate-in slide-in-from-top-1 duration-200">
                      {/* Group Meeting */}
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.isGroupMeeting}
                            onChange={(e) => {
                              const isGroupMeeting = e.target.checked
                              const updatedFormData = { ...formData, isGroupMeeting }
                              
                              // If enabling group meeting and we have an invitee email, add it to participants
                              if (isGroupMeeting && formData.inviteeEmail.trim() && !formData.participantEmails.includes(formData.inviteeEmail.trim())) {
                                updatedFormData.participantEmails = [...formData.participantEmails, formData.inviteeEmail.trim()]
                              }
                              
                              setFormData(updatedFormData)
                            }}
                            disabled={!canUseGroupMeetings}
                            className="mr-3 h-4 w-4"
                          />
                          <span className="text-sm font-medium">
                            <Users className="h-4 w-4 inline mr-1" />
                            Group Meeting (Multiple Participants)
                          </span>
                        </label>
                        
                        {!canUseGroupMeetings && (
                          <p className="text-xs text-amber-600 mt-1 ml-7">
                            Upgrade to Coaching plan to enable group meetings with up to 10 participants
                          </p>
                        )}
                        
                        {formData.isGroupMeeting && canUseGroupMeetings && (
                          <div className="mt-4 ml-7 space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                Maximum Participants
                              </label>
                              <select
                                value={formData.maxParticipants}
                                onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                {Array.from({ length: 9 }, (_, i) => i + 2).map(num => (
                                  <option key={num} value={num}>{num} participants</option>
                                ))}
                              </select>
                            </div>
                            
                            {/* Participant Email Management */}
                            {/* Group Meeting Deadline Settings */}
                            <div className="border-t border-slate-200 pt-4">
                              <h4 className="font-medium text-slate-700 mb-3">Deadline Settings</h4>
                              
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Participants must connect calendars within:
                                  </label>
                                  <select
                                    value={formData.deadlineHours}
                                    onChange={(e) => setFormData({ ...formData, deadlineHours: parseInt(e.target.value) })}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  >
                                    <option value={24}>24 hours (1 day)</option>
                                    <option value={48}>48 hours (2 days)</option>
                                    <option value={72}>72 hours (3 days)</option>
                                    <option value={168}>1 week</option>
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-3">
                                    What happens at the deadline?
                                  </label>
                                  <div className="space-y-3">
                                    <label className="flex items-start space-x-3 p-3 border border-slate-200 rounded-lg hover:border-blue-400 transition-colors cursor-pointer">
                                      <input
                                        type="radio"
                                        name="deadlineAction"
                                        checked={!formData.autoSelectAtDeadline}
                                        onChange={() => setFormData({ ...formData, autoSelectAtDeadline: false })}
                                        className="mt-1"
                                      />
                                      <div>
                                        <div className="font-medium text-sm">🎯 I'll choose the time</div>
                                        <div className="text-xs text-slate-600 mt-1">
                                          You'll get an email to select from AI suggestions when the deadline hits
                                        </div>
                                      </div>
                                    </label>
                                    
                                    <label className="flex items-start space-x-3 p-3 border border-slate-200 rounded-lg hover:border-blue-400 transition-colors cursor-pointer">
                                      <input
                                        type="radio"
                                        name="deadlineAction"
                                        checked={formData.autoSelectAtDeadline}
                                        onChange={() => setFormData({ ...formData, autoSelectAtDeadline: true })}
                                        className="mt-1"
                                      />
                                      <div>
                                        <div className="font-medium text-sm">🤖 AI auto-selects best time</div>
                                        <div className="text-xs text-slate-600 mt-1">
                                          AI will automatically pick the optimal time and send calendar invites
                                        </div>
                                      </div>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                Participant Email Addresses
                              </label>
                              <div className="space-y-2">
                                {formData.participantEmails.map((email, index) => (
                                  <div key={index} className="flex items-center space-x-2">
                                    <input
                                      type="email"
                                      placeholder="participant@example.com"
                                      value={email}
                                      onChange={(e) => {
                                        const newEmails = [...formData.participantEmails]
                                        newEmails[index] = e.target.value
                                        setFormData({ ...formData, participantEmails: newEmails })
                                      }}
                                      className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newEmails = formData.participantEmails.filter((_, i) => i !== index)
                                        setFormData({ ...formData, participantEmails: newEmails })
                                      }}
                                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors touch-target"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                                
                                {formData.participantEmails.length < formData.maxParticipants - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData({ 
                                        ...formData, 
                                        participantEmails: [...formData.participantEmails, ''] 
                                      })
                                    }}
                                    className="w-full p-3 border-2 border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 rounded-lg transition-colors touch-target"
                                  >
                                    + Add Participant Email
                                  </button>
                                )}
                              </div>
                              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                                <p className="text-xs font-medium text-slate-700 mb-2">
                                  Participants ({formData.participantEmails.filter(email => email.trim()).length + 1} of {formData.maxParticipants}):
                                </p>
                                <div className="space-y-1">
                                  <p className="text-xs text-slate-600">• {userInfo.name} ({userInfo.email}) - Organizer</p>
                                  {formData.participantEmails.filter(email => email.trim()).map((email, index) => (
                                    <p key={index} className="text-xs text-slate-600">• {email}</p>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Recurring Sessions */}
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.isRecurring}
                            onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                            disabled={!canUseRecurring}
                            className="mr-3 h-4 w-4"
                          />
                          <span className="text-sm font-medium">
                            <RefreshCw className="h-4 w-4 inline mr-1" />
                            Recurring Sessions
                          </span>
                        </label>
                        
                        {!canUseRecurring && (
                          <p className="text-xs text-amber-600 mt-1 ml-7">
                            Upgrade to Coaching plan to enable recurring sessions
                          </p>
                        )}
                        
                        {formData.isRecurring && canUseRecurring && (
                          <div className="mt-4 ml-7">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              Recurring Pattern
                            </label>
                            <select
                              value={formData.recurringPattern}
                              onChange={(e) => setFormData({ ...formData, recurringPattern: e.target.value })}
                              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="weekly">Weekly</option>
                              <option value="biweekly">Bi-weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>


                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-4 text-lg"
                >
                  {loading ? '✨ Sending Smart Invite...' : 
                   formData.isGroupMeeting ? '✨ Send Group Smart Invites' :
                   formData.inviteeEmail ? '✨ Send Smart Invite' :
                   '✨ Send Smart Invite'
                  }
                </button>
              </form>
            </div>
          )}


          {/* Final Step: Smart Scheduling Activated */}
          {step === 3 && (
            <div className="card text-center">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-6">
                  <Check className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold mb-4">
                  Meeting Invitation Sent!
                </h1>
                <p className="text-slate-600 text-lg">
                  Your recipient will experience zero back-and-forth scheduling. Our AI will find perfect times that work for both of you.
                </p>
              </div>

              {/* The CalendarSync Magic */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-6">The CalendarSync Magic</h3>
                <div className="space-y-4 text-left">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Email delivered</p>
                      <p className="text-slate-600 text-sm">Your recipient gets a personalized meeting request</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">One-click calendar connection</p>
                      <p className="text-slate-600 text-sm">They connect their calendar securely in 30 seconds</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">AI finds perfect mutual times</p>
                      <p className="text-slate-600 text-sm">Our system analyzes both calendars and suggests 5 optimal times that work for everyone</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Instant confirmation</p>
                      <p className="text-slate-600 text-sm">They pick their favorite time and you're both automatically confirmed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Backup Link */}
              <div className="mb-8">
                <div className="bg-slate-50 rounded-lg p-6">
                  <h3 className="text-sm font-medium text-slate-700 mb-3 uppercase tracking-wide">Backup Link (if needed)</h3>
                  <div className="flex items-center space-x-3 mb-3">
                    <code className="flex-1 text-left p-4 bg-white border border-slate-200 rounded-lg text-sm font-mono">
                      {shareLink}
                    </code>
                    <button
                      onClick={copyToClipboard}
                      className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-slate-600 text-sm">
                    Share this link directly if your recipient doesn't receive the email or wants to book additional times.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setStep(2)
                    setShareLink('')
                    setFormData({
                      ...formData,
                      meetingTitle: '',
                      meetingDescription: '',
                      meetingLink: profile?.defaultVideoLink || '',
                      phoneNumber: profile?.defaultPhoneNumber || '',
                      address: profile?.defaultAddress || '',
                      meetingNotes: profile?.defaultMeetingNotes || '',
                      inviteeName: '',
                      inviteeEmail: '',
                      personalMessage: ''
                    })
                  }}
                  className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  Schedule Another
                </button>
                <Link href="/dashboard" className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors">
                  View My Meetings
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}