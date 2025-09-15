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
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [showFollowUps, setShowFollowUps] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [copied, setCopied] = useState(false)
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorName: 'Neal Quesnel', // TODO: Get from auth
          creatorEmail: 'neal@whatarmy.com', // TODO: Get from auth
          meetingTitle: formData.meetingTitle,
          meetingDescription: formData.meetingDescription,
          duration: formData.duration,
          meetingType: formData.meetingType,
          meetingLink: formData.meetingLink,
          phoneNumber: formData.phoneNumber,
          address: formData.address,
          meetingNotes: formData.meetingNotes,
          inviteeEmail: formData.inviteeEmail,
          inviteeName: formData.inviteeName,
          personalMessage: formData.personalMessage,
          isGroupMeeting: formData.isGroupMeeting,
          maxParticipants: formData.maxParticipants,
          participantEmails: formData.participantEmails,
          enableFollowUps: formData.enableFollowUps,
          isRecurring: formData.isRecurring,
          recurringPattern: formData.recurringPattern
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Automatically send email invite
        if (formData.inviteeEmail && data.shareLink) {
          try {
            const inviteResponse = await fetch('/api/bookings/send-invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                shareLink: data.shareLink,
                recipientEmail: formData.inviteeEmail,
                recipientName: formData.inviteeName,
                message: formData.personalMessage,
                creatorName: 'Neal Quesnel',
                meetingTitle: formData.meetingTitle
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Meeting Request</h1>
            <p className="text-slate-600">Set up your meeting in under 30 seconds</p>
          </div>

          {!showSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    <span>Send Smart Invite</span>
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
    </div>
  )
}