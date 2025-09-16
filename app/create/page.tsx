'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Video, 
  Phone, 
  MapPin, 
  Settings, 
  Users,
  ChevronDown,
  ChevronUp,
  Mail,
  Clock,
  Calendar,
  CheckCircle,
  RefreshCw,
  Copy
} from 'lucide-react'

interface FormData {
  inviteeName: string
  inviteeEmail: string
  meetingTitle: string
  meetingDescription: string
  duration: number
  meetingType: string
  meetingLink: string
  phoneNumber: string
  address: string
  meetingNotes: string
  personalMessage: string
  enableFollowUps: boolean
  isGroupMeeting: boolean
  maxParticipants: number
  participantEmails: string[]
  isRecurring: boolean
  recurringPattern: string
}

export default function StreamlinedCreatePage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: Meeting Details, 2: Connect Calendar
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [showFollowUps, setShowFollowUps] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  
  const [formData, setFormData] = useState<FormData>({
    inviteeName: '',
    inviteeEmail: '',
    meetingTitle: '',
    meetingDescription: '',
    duration: 30, // Default to 30 minutes
    meetingType: 'video', // Default to video call
    meetingLink: '',
    phoneNumber: '',
    address: '',
    meetingNotes: '',
    personalMessage: '',
    enableFollowUps: false,
    isGroupMeeting: false,
    maxParticipants: 2,
    participantEmails: [],
    isRecurring: false,
    recurringPattern: 'weekly'
  })

  // Check for OAuth callback and pending meeting
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const creatorConnected = urlParams.get('creator_connected')
    
    if (creatorConnected) {
      // User just authenticated, process pending meeting
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
      
      // Check expiration
      if (Date.now() > meetingData.expiresAt) {
        sessionStorage.removeItem('pendingMeeting')
        alert('Meeting session expired. Please create your meeting again.')
        setStep(1)
        return
      }

      // Create meeting with authenticated user data
      setLoading(true)
      await handleSubmit(null, meetingData)
      
      // Clean up
      sessionStorage.removeItem('pendingMeeting')
    } catch (error) {
      console.error('Error processing pending meeting:', error)
      alert('Error processing meeting. Please try again.')
      setStep(1)
    }
  }

  const handleSubmit = async (e: React.FormEvent | null, pendingMeetingData?: any) => {
    if (e) e.preventDefault()
    setLoading(true)
    
    try {
      // Get authenticated user data
      const profileResponse = await fetch('/api/profile')
      const profileData = await profileResponse.json()
      
      if (!profileData.profile) {
        throw new Error('User not authenticated')
      }
      
      const dataToUse = pendingMeetingData || formData
      
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorName: profileData.profile.name,
          creatorEmail: profileData.profile.email,
          meetingTitle: dataToUse.meetingTitle,
          meetingDescription: dataToUse.meetingDescription,
          duration: dataToUse.duration,
          meetingType: dataToUse.meetingType,
          meetingLink: dataToUse.meetingLink,
          phoneNumber: dataToUse.phoneNumber,
          address: dataToUse.address,
          meetingNotes: dataToUse.meetingNotes,
          inviteeEmail: dataToUse.inviteeEmail,
          inviteeName: dataToUse.inviteeName,
          personalMessage: dataToUse.personalMessage,
          isGroupMeeting: dataToUse.isGroupMeeting,
          maxParticipants: dataToUse.maxParticipants,
          participantEmails: dataToUse.participantEmails,
          enableFollowUps: dataToUse.enableFollowUps,
          isRecurring: dataToUse.isRecurring,
          recurringPattern: dataToUse.recurringPattern,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // Detect user's timezone
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Automatically send email invite
        if (dataToUse.inviteeEmail && data.shareLink) {
          try {
            const inviteResponse = await fetch('/api/bookings/send-invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                shareLink: data.shareLink,
                recipientEmail: dataToUse.inviteeEmail,
                recipientName: dataToUse.inviteeName,
                message: dataToUse.personalMessage,
                creatorName: profileData.profile.name,
                meetingTitle: dataToUse.meetingTitle
              })
            })
            
            if (inviteResponse.ok) {
              console.log('📧 Email invite sent successfully')
            } else {
              console.error('Email sending failed:', await inviteResponse.text())
            }
          } catch (error) {
            console.error('Error sending invite:', error)
          }
        }
        
        // Show success state
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

  const handleStepOne = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.inviteeEmail || !formData.meetingTitle) {
      alert('Please fill in both email address and meeting title to continue.')
      return
    }
    
    // Store meeting details in session storage with expiration
    const meetingData = {
      ...formData,
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hour expiration
    }
    
    sessionStorage.setItem('pendingMeeting', JSON.stringify(meetingData))
    
    // Proceed to Step 2
    setStep(2)
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

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="container-width flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-slate-900">
            Syncthesis
          </Link>
        </div>
      </nav>

      <div className="container-width py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            {/* Progress Indicator */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-4">
                <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    1
                  </div>
                  <span className="font-medium">Create Meeting</span>
                </div>
                <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    2
                  </div>
                  <span className="font-medium">Link Calendar</span>
                </div>
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {step === 1 ? 'Create Meeting Request' : 'Connect Your Calendar'}
            </h1>
            <p className="text-slate-600">
              {step === 1 ? 'Set up your meeting details' : 'Quick 30-second setup to send your invite'}
            </p>
          </div>

          {!showSuccess ? (
            step === 1 ? (
              /* Step 1: Meeting Details Form */
              <form onSubmit={handleStepOne} className="space-y-6">
            {/* PRIORITY 1: Essential Fields - Always Visible */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="space-y-5">
                
                {/* Invitee Email - Most Important */}
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
                    className="w-full p-3 text-base border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    autoFocus
                  />
                  {formData.inviteeEmail && (
                    <input
                      type="text"
                      placeholder="Their name (optional)"
                      value={formData.inviteeName}
                      onChange={(e) => setFormData({ ...formData, inviteeName: e.target.value })}
                      className="w-full mt-2 p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                    />
                  )}
                </div>

                {/* Meeting Title */}
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
                    className="w-full p-3 text-base border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Duration
                  </label>
                  <div className="grid grid-cols-3 gap-2">
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
                            const customDuration = prompt('Enter duration in minutes:', '45')
                            if (customDuration && !isNaN(Number(customDuration))) {
                              setFormData({ ...formData, duration: Number(customDuration) })
                            }
                          } else {
                            setFormData({ ...formData, duration: value })
                          }
                        }}
                        className={`p-3 text-sm font-medium rounded-lg transition-all ${
                          formData.duration === value || (value === 0 && ![30, 60].includes(formData.duration))
                            ? 'bg-blue-500 text-white shadow-md'
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
                        className={`p-3 text-sm font-medium rounded-lg transition-all flex items-center justify-center space-x-2 ${
                          formData.meetingType === value
                            ? 'bg-blue-500 text-white shadow-md'
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
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                  />
                )}
                
                {formData.meetingType === 'phone' && (
                  <input
                    type="tel"
                    placeholder="+1 (555) 123-4567 or 'I'll call you'"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                  />
                )}
                
                {formData.meetingType === 'in-person' && (
                  <input
                    type="text"
                    placeholder="123 Main St, City, State or Building/Room"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                  />
                )}
                
                {formData.meetingType === 'custom' && (
                  <input
                    type="text"
                    placeholder="Custom meeting instructions..."
                    value={formData.meetingNotes}
                    onChange={(e) => setFormData({ ...formData, meetingNotes: e.target.value })}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                  />
                )}

                {/* Follow-up Reminders - Inside Main Box */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="group relative">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enableFollowUps}
                        onChange={(e) => setFormData({ ...formData, enableFollowUps: e.target.checked })}
                        className="h-5 w-5 text-blue-500 rounded"
                      />
                      <span className="text-sm font-medium text-slate-700">Send follow-up reminders if no response</span>
                      <Mail className="h-4 w-4 text-slate-400" />
                    </label>
                    {/* Tooltip */}
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap z-10">
                      2 follow-ups: after 2 and 3 business days during business hours
                      <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PRIORITY 2: Secondary Options - Collapsed by Default */}
            
            {/* Meeting Agenda */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowMessage(!showMessage)}
                className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-slate-700">Add Meeting Agenda (Recommended)</span>
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                {showMessage ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {showMessage && (
                <div className="px-4 pb-4">
                  <textarea
                    placeholder="Discussion topics, goals, prep work needed..."
                    value={formData.personalMessage}
                    onChange={(e) => setFormData({ ...formData, personalMessage: e.target.value })}
                    rows={3}
                    className="w-full p-3 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-400 focus:border-blue-400 resize-none"
                  />
                </div>
              )}
            </div>

            {/* Advanced Options */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Settings className="h-4 w-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">Advanced Scheduling (Optional)</span>
                </div>
                {showAdvanced ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {showAdvanced && (
                <div className="px-4 pb-4 space-y-4 border-t border-slate-100">
                  
                  {/* Group Meeting Toggle */}
                  <div className="pt-4">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isGroupMeeting}
                        onChange={(e) => {
                          const isGroupMeeting = e.target.checked
                          const updatedFormData = { ...formData, isGroupMeeting }
                          
                          // Auto-transfer original invitee to participants when enabling group mode
                          if (isGroupMeeting && formData.inviteeEmail.trim() && !formData.participantEmails.includes(formData.inviteeEmail.trim())) {
                            updatedFormData.participantEmails = [...formData.participantEmails, formData.inviteeEmail.trim()]
                          }
                          
                          setFormData(updatedFormData)
                        }}
                        className="h-4 w-4 text-blue-500 rounded"
                      />
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">Group Meeting (Multiple Participants)</span>
                    </label>
                  </div>

                  {/* Group Participants */}
                  {formData.isGroupMeeting && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-slate-700">Additional Participants:</p>
                      
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
                            className="flex-1 p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-400"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newEmails = formData.participantEmails.filter((_, i) => i !== index)
                              setFormData({ ...formData, participantEmails: newEmails })
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ 
                            ...formData, 
                            participantEmails: [...formData.participantEmails, ''] 
                          })
                        }}
                        className="w-full p-3 border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 rounded-lg text-sm transition-colors"
                      >
                        + Add Participant
                      </button>

                      {/* Participant Summary */}
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs font-medium text-slate-700 mb-1">
                          Participants ({formData.participantEmails.filter(email => email.trim()).length + 1}):
                        </p>
                        <div className="space-y-1">
                          <p className="text-xs text-slate-600">• You (Organizer)</p>
                          {formData.participantEmails.filter(email => email.trim()).map((email, index) => (
                            <p key={index} className="text-xs text-slate-600">• {email}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recurring Sessions */}
                  <div>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isRecurring || false}
                        onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                        className="h-4 w-4 text-blue-500 rounded"
                      />
                      <RefreshCw className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">Recurring Sessions (Premium)</span>
                    </label>
                    
                    {formData.isRecurring && (
                      <div className="mt-3 ml-7">
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
                    
                    {!formData.isRecurring && (
                      <p className="text-xs text-slate-500 mt-1 ml-7">Set up weekly, bi-weekly, or monthly recurring meetings</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* PRIORITY 4: Prominent Send Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                onClick={(e) => {
                  if (!formData.inviteeEmail || !formData.meetingTitle) {
                    e.preventDefault()
                    alert('Please fill in both email address and meeting title to continue.')
                    return
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl text-base transition-all shadow-lg hover:shadow-xl min-h-[44px]"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Creating Meeting...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Continue to Step 2</span>
                  </div>
                )}
              </button>
            </div>

            {/* Dynamic Form Validation Feedback */}
            <div className="text-center">
              <p className="text-sm font-medium">
                {!formData.inviteeEmail && !formData.meetingTitle ? (
                  <span className="text-slate-500">Email and title required</span>
                ) : !formData.inviteeEmail ? (
                  <span className="text-amber-600">Email address required</span>
                ) : !formData.meetingTitle ? (
                  <span className="text-amber-600">Meeting title required</span>
                ) : (
                  <span className="text-green-600 flex items-center justify-center space-x-1">
                    <CheckCircle className="h-4 w-4" />
                    <span>Ready to send!</span>
                  </span>
                )}
              </p>
            </div>
              </form>
            ) : (
              /* Step 2: Modern Product Launch Style */
              <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-700 relative overflow-hidden">
                {/* Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-700 animate-pulse opacity-80"></div>
                
                {/* Subtle Floating Shapes */}
                <div className="absolute top-20 left-10 w-20 h-20 bg-white bg-opacity-10 rounded-full blur-xl animate-bounce"></div>
                <div className="absolute bottom-32 right-16 w-32 h-32 bg-blue-300 bg-opacity-20 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-purple-400 bg-opacity-15 rounded-full blur-lg animate-bounce" style={{animationDelay: '2s'}}></div>
                
                <div className="relative z-10 max-w-[1400px] mx-auto px-6 sm:px-12 py-12 sm:py-20">
                  <div className="grid lg:grid-cols-3 xl:grid-cols-7 gap-8 lg:gap-16">
                    
                    {/* LEFT COLUMN - CONNECTION HERO (Expanded for desktop) */}
                    <div className="lg:col-span-2 xl:col-span-4 space-y-10">
                      {/* Main Headline */}
                      <div className="text-center lg:text-left">
                        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-2 flex items-center justify-center lg:justify-start space-x-3">
                          <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                          </svg>
                          <span>Ready to Deploy Smart Scheduling?</span>
                        </h1>
                        <p className="text-xl text-white text-opacity-80 font-normal">
                          30-second connection, lifetime of effortless meetings
                        </p>
                      </div>

                      {/* Calendar Connection Buttons - Expanded for Desktop */}
                      <div className="space-y-8">
                        <button
                          onClick={() => window.location.href = '/api/auth/google/creator'}
                          className="group w-full bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:scale-102 transition-all duration-300 flex items-center space-x-6 border-3 border-blue-500 min-h-[120px]"
                          style={{boxShadow: '0 20px 40px rgba(66,133,244,0.3)'}}
                        >
                          <svg className="w-12 h-12 group-hover:scale-110 transition-transform flex-shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          <div className="text-left flex-1">
                            <div className="text-2xl font-bold text-slate-900 mb-1">Google Calendar</div>
                            <div className="text-lg text-blue-600 font-semibold">Most popular • Connect in 30 seconds</div>
                          </div>
                          <div className="text-blue-500 group-hover:translate-x-1 transition-transform">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>

                        <button
                          onClick={() => window.location.href = '/api/auth/microsoft/creator'}
                          className="group w-full bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:scale-102 transition-all duration-300 flex items-center space-x-6 border-3 border-orange-500 min-h-[120px]"
                          style={{boxShadow: '0 20px 40px rgba(0,120,212,0.3)'}}
                        >
                          <svg className="w-12 h-12 group-hover:scale-110 transition-transform flex-shrink-0" viewBox="0 0 24 24">
                            <path fill="#00A4EF" d="M11.5 11.5v-11h-11v11h11z"/>
                            <path fill="#FFB900" d="M24 11.5v-11h-11v11h11z"/>
                            <path fill="#00D924" d="M11.5 24v-11h-11v11h11z"/>
                            <path fill="#FF3E00" d="M24 24v-11h-11v11h11z"/>
                          </svg>
                          <div className="text-left flex-1">
                            <div className="text-2xl font-bold text-slate-900 mb-1">Microsoft Outlook</div>
                            <div className="text-lg text-orange-600 font-semibold">Enterprise • Instant connection</div>
                          </div>
                          <div className="text-orange-500 group-hover:translate-x-1 transition-transform">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      </div>

                      {/* Social Proof */}
                      <div className="text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start space-x-3">
                          <div className="flex -space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full border-2 border-white"></div>
                            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full border-2 border-white"></div>
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full border-2 border-white"></div>
                            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full border-2 border-white"></div>
                          </div>
                          <p className="text-sm text-white text-opacity-70">
                            Join 10,000+ who never send "when are you free?" emails again
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN - EXPANDED EXCITEMENT & PREVIEW */}
                    <div className="lg:col-span-1 xl:col-span-3 space-y-8">
                      {/* What Happens Next - Expanded */}
                      <div>
                        <h2 className="text-3xl font-bold text-white mb-6">What Happens Next</h2>
                        <div className="space-y-6">
                          <div className="flex items-center space-x-4 text-white text-opacity-90">
                            <div className="w-12 h-12 bg-yellow-400 bg-opacity-20 rounded-full flex items-center justify-center">
                              <span className="text-2xl">✨</span>
                            </div>
                            <div>
                              <div className="text-xl font-semibold text-white">AI finds perfect mutual times instantly</div>
                              <div className="text-sm text-white text-opacity-70">Advanced calendar analysis in seconds</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-white text-opacity-90">
                            <div className="w-12 h-12 bg-green-400 bg-opacity-20 rounded-full flex items-center justify-center">
                              <span className="text-2xl">⚡</span>
                            </div>
                            <div>
                              <div className="text-xl font-semibold text-white">Your recipient books in under 2 minutes</div>
                              <div className="text-sm text-white text-opacity-70">No back-and-forth coordination needed</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 text-white text-opacity-90">
                            <div className="w-12 h-12 bg-purple-400 bg-opacity-20 rounded-full flex items-center justify-center">
                              <span className="text-2xl">🎯</span>
                            </div>
                            <div>
                              <div className="text-xl font-semibold text-white">Zero back-and-forth emails ever again</div>
                              <div className="text-sm text-white text-opacity-70">Automatic calendar integration for both parties</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Meeting Preview Card */}
                      <div className="relative bg-white bg-opacity-15 backdrop-blur-xl rounded-3xl p-8 border border-white border-opacity-30 shadow-2xl">
                        {/* AI-Powered Badge */}
                        <div className="absolute -top-4 -right-4">
                          <div className="bg-gradient-to-r from-pink-500 to-yellow-400 text-white text-sm font-bold px-4 py-2 rounded-full shadow-xl animate-pulse">
                            ✨ AI-Powered
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-2xl font-bold text-white">Meeting Preview</h3>
                          <button
                            onClick={() => setShowEditModal(true)}
                            className="text-white hover:text-yellow-300 p-3 rounded-xl hover:bg-white hover:bg-opacity-20 transition-all"
                          >
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                        
                        <div className="space-y-4 text-base text-white text-opacity-95">
                          <div className="flex justify-between items-center py-2 border-b border-white border-opacity-20">
                            <strong className="text-white text-lg">To:</strong> 
                            <span className="text-lg">{formData.inviteeEmail}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-white border-opacity-20">
                            <strong className="text-white text-lg">Title:</strong>
                            <span className="text-lg">{formData.meetingTitle}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-white border-opacity-20">
                            <strong className="text-white text-lg">Duration:</strong>
                            <span className="text-lg">{formData.duration} minutes</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-white border-opacity-20">
                            <strong className="text-white text-lg">Type:</strong>
                            <span className="text-lg">{formData.meetingType.charAt(0).toUpperCase() + formData.meetingType.slice(1)}</span>
                          </div>
                          {formData.meetingType === 'video' && (
                            <div className="flex justify-between items-center py-2">
                              <strong className="text-white text-lg">Link:</strong>
                              <span className="text-lg">{formData.meetingLink || 'To be provided'}</span>
                            </div>
                          )}
                          {formData.meetingType === 'phone' && (
                            <div className="flex justify-between items-center py-2">
                              <strong className="text-white text-lg">Phone:</strong>
                              <span className="text-lg">{formData.phoneNumber || 'To be provided'}</span>
                            </div>
                          )}
                          {formData.meetingType === 'in-person' && (
                            <div className="flex justify-between items-center py-2">
                              <strong className="text-white text-lg">Location:</strong>
                              <span className="text-lg">{formData.address || 'To be provided'}</span>
                            </div>
                          )}
                          {formData.meetingType === 'custom' && (
                            <div className="flex justify-between items-center py-2">
                              <strong className="text-white text-lg">Details:</strong>
                              <span className="text-lg">{formData.meetingNotes || 'To be provided'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            /* Success Screen */
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
                  onClick={() => {
                    setShowSuccess(false)
                    setShareLink('')
                    setCopied(false)
                    setFormData({
                      inviteeName: '',
                      inviteeEmail: '',
                      meetingTitle: '',
                      meetingDescription: '',
                      duration: 30,
                      meetingType: 'video',
                      meetingLink: '',
                      phoneNumber: '',
                      address: '',
                      meetingNotes: '',
                      personalMessage: '',
                      enableFollowUps: false,
                      isGroupMeeting: false,
                      maxParticipants: 2,
                      participantEmails: [],
                      isRecurring: false,
                      recurringPattern: 'weekly'
                    })
                  }}
                  className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  Create Another
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                >
                  View Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal Overlay */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-lg w-full max-h-[95vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Edit Meeting Details</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Invitee Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.inviteeEmail}
                  onChange={(e) => setFormData({ ...formData, inviteeEmail: e.target.value })}
                  className="w-full p-3 text-base border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.meetingTitle}
                  onChange={(e) => setFormData({ ...formData, meetingTitle: e.target.value })}
                  className="w-full p-3 text-base border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
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
                          const customDuration = prompt('Enter duration in minutes:', '45')
                          if (customDuration && !isNaN(Number(customDuration))) {
                            setFormData({ ...formData, duration: Number(customDuration) })
                          }
                        } else {
                          setFormData({ ...formData, duration: value })
                        }
                      }}
                      className={`p-2 text-sm font-medium rounded-lg transition-all ${
                        formData.duration === value || (value === 0 && ![30, 60].includes(formData.duration))
                          ? 'bg-blue-500 text-white shadow-md'
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Meeting Type
                </label>
                <div className="grid grid-cols-4 gap-2">
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
                      className={`p-2 text-xs font-medium rounded-lg transition-all flex flex-col items-center space-y-1 ${
                        formData.meetingType === value
                          ? 'bg-blue-500 text-white shadow-md'
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Video Meeting Link
                  </label>
                  <input
                    type="url"
                    placeholder="https://zoom.us/j/your-meeting-id"
                    value={formData.meetingLink}
                    onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              )}
              
              {formData.meetingType === 'phone' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 123-4567 or 'I'll call you'"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              )}
              
              {formData.meetingType === 'in-person' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Meeting Location
                  </label>
                  <input
                    type="text"
                    placeholder="123 Main St, City, State or Building/Room"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              )}
              
              {formData.meetingType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Custom Instructions
                  </label>
                  <input
                    type="text"
                    placeholder="Custom meeting instructions..."
                    value={formData.meetingNotes}
                    onChange={(e) => setFormData({ ...formData, meetingNotes: e.target.value })}
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}