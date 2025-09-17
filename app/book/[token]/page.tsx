'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Clock, CheckCircle, User, Loader2, Zap, ArrowRight, RefreshCw, Edit, Trash2, UserPlus, Save, X, Video, Phone, MapPin, Users as UsersIcon } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface Booking {
  id: string
  creatorName: string
  creatorEmail: string
  recipientEmail?: string
  recipientName?: string
  title: string
  description?: string
  duration: number
  status: string
  selectedTime?: string
  meetingType: string
  meetingLink?: string
  phoneNumber?: string
  address?: string
  meetingNotes?: string
  isGroupMeeting: boolean
  maxParticipants: number
  participantDeadline?: string
  autoSelectAtDeadline?: boolean
  allParticipantsConnected?: boolean
  readyForSelection?: string
}

interface TimeSuggestion {
  id: string
  startTime: string
  endTime: string
  score: number
  contextLabel?: string
  reasoning?: string
  isBestMatch?: boolean
}

export default function BookingPage() {
  const { token } = useParams()
  const [booking, setBooking] = useState<Booking | null>(null)
  const [suggestions, setSuggestions] = useState<TimeSuggestion[]>([])
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [step, setStep] = useState(1) // 1: Connect Calendar, 2: Select Time, 3: Confirmed
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [recipientInfo, setRecipientInfo] = useState({ name: '', email: '' })
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [showRescheduleOptions, setShowRescheduleOptions] = useState(false)
  const [rescheduleLoading, setRescheduleLoading] = useState(false)
  const [rescheduleOptions, setRescheduleOptions] = useState<any[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [groupStatus, setGroupStatus] = useState<any>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    duration: 30,
    meetingType: 'video',
    meetingLink: '',
    phoneNumber: '',
    address: '',
    meetingNotes: '',
    newDate: '',
    newTime: ''
  })
  const [invitees, setInvitees] = useState<string[]>([])
  const [newInvitee, setNewInvitee] = useState('')
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchBooking = async () => {
    try {
      const response = await fetch(`/api/bookings/${token}`)
      const data = await response.json()
      
      if (data.booking) {
        setBooking(data.booking)
        
        // We'll determine if user is organizer after checking auth status
        setIsOrganizer(false)
        
        // For group meetings, get participant status
        if (data.booking.isGroupMeeting) {
          setGroupStatus({
            totalParticipants: (data.participants?.length || 0) + 1, // +1 for organizer
            connectedParticipants: (data.participants?.filter((p: any) => p.calendarConnected).length || 0) + 1, // +1 for organizer
            allConnected: data.booking.allParticipantsConnected,
            deadline: data.booking.participantDeadline,
            autoSelect: data.booking.autoSelectAtDeadline,
            readyForSelection: data.booking.readyForSelection
          })
        }
        
        // Initialize edit form with booking data for organizers (this will be handled by a separate useEffect)
        const selectedTime = data.booking.selectedTime ? new Date(data.booking.selectedTime) : null
        setEditForm({
          title: data.booking.title || '',
          description: data.booking.description || '',
          duration: data.booking.duration || 30,
          meetingType: data.booking.meetingType || 'video',
          meetingLink: data.booking.meetingLink || '',
          phoneNumber: data.booking.phoneNumber || '',
          address: data.booking.address || '',
          meetingNotes: data.booking.meetingNotes || '',
          newDate: selectedTime ? selectedTime.toISOString().split('T')[0] : '',
          newTime: selectedTime ? selectedTime.toTimeString().slice(0, 5) : ''
        })
        
        // Set invitees
        const currentInvitees = []
        if (data.booking.recipientEmail) {
          currentInvitees.push(data.booking.recipientEmail)
        }
        setInvitees(currentInvitees)
        
        if (data.booking.status === 'confirmed') {
          // Check if this is an edit request
          const params = new URLSearchParams(window.location.search)
          if (params.get('edit') === 'true') {
            setStep(1) // Show management view for editing
          } else {
            setStep(3) // Show confirmation view normally
          }
        }
        
        // After booking is loaded, check for auto-login (pass booking data directly)
        setTimeout(() => checkAutoLogin(data.booking), 100) // Small delay to ensure state is updated
      }
    } catch (error) {
      console.error('Error fetching booking:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true)
    setSuggestionsError(null)
    try {
      const response = await fetch(`/api/bookings/${token}/suggestions`)
      const data = await response.json()
      
      if (data.suggestions) {
        setSuggestions(data.suggestions)
      } else if (data.error) {
        setSuggestionsError(data.error)
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      setSuggestionsError('Failed to analyze calendar availability. Please try reconnecting your calendar.')
    } finally {
      setLoadingSuggestions(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    checkAuthStatus()
    fetchBooking()
    
    // Check if returning from OAuth or edit mode
    const params = new URLSearchParams(window.location.search)
    
    // Check if this is an edit request from dashboard
    if (params.get('edit') === 'true') {
      // Force step 1 (management view) even for confirmed bookings
      setStep(1)
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
    
    if (params.get('connected') === 'true') {
      setCalendarConnected(true)
      
      // Get recipient info from URL params (passed from OAuth callback)
      const recipientEmail = params.get('email')
      const recipientName = params.get('name')
      
      if (recipientEmail && recipientName) {
        setRecipientInfo({ 
          email: recipientEmail, 
          name: decodeURIComponent(recipientName) 
        })
        
        // For group meetings, notify that this participant connected
        if (booking?.isGroupMeeting && !isOrganizer) {
          fetch(`/api/bookings/${token}/participant-connected`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participantEmail: recipientEmail })
          }).catch(error => {
            console.error('Error notifying participant connection:', error)
          })
        }
      }
      
      setStep(2)
      fetchSuggestions()
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [token])

  // Separate effect to check organizer status once booking data is available
  useEffect(() => {
    if (booking && isLoggedIn) {
      checkOrganizerStatus()
    }
  }, [booking, isLoggedIn])

  const checkOrganizerStatus = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        if (data.profile && booking && data.profile.email === booking.creatorEmail) {
          setIsOrganizer(true)
        }
      }
    } catch (error) {
      console.error('Error checking organizer status:', error)
    }
  }
  
  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/profile')
      setIsLoggedIn(response.ok && response.status !== 401)
    } catch (error) {
      setIsLoggedIn(false)
    }
  }

  const checkAutoLogin = async (bookingData?: Booking) => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok && response.status !== 401) {
        const data = await response.json()
        
        // Use passed booking data or fallback to state
        const currentBooking = bookingData || booking
        
        // If user is logged in and has a calendar connected, and this is not the organizer,
        // automatically proceed to step 2 (time selection)
        const userIsOrganizer = currentBooking && data.profile && data.profile.email === currentBooking.creatorEmail
        console.log('Auto-login check:', {
          hasProfile: !!data.profile,
          calendarConnected: data.calendarConnected,
          userEmail: data.profile?.email,
          bookingCreator: currentBooking?.creatorEmail,
          isOrganizer: userIsOrganizer,
          hasBooking: !!currentBooking
        })
        
        // Proceed if user has calendar connected AND booking is not already confirmed
        // Allow both organizers (for testing) and recipients
        if (data.profile && data.calendarConnected && currentBooking && currentBooking.status !== 'confirmed') {
          console.log('User already logged in with calendar connected, proceeding to time selection')
          
          // Set recipient info from authenticated user
          setRecipientInfo({
            name: data.profile.name,
            email: data.profile.email
          })
          
          // Update booking with recipient details
          try {
            await fetch(`/api/bookings/${token}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipientEmail: data.profile.email,
                recipientName: data.profile.name,
                recipientId: data.profile.id
              })
            })
          } catch (error) {
            console.error('Error updating booking with recipient info:', error)
          }
          
          // Skip to step 2 and fetch suggestions
          setStep(2)
          fetchSuggestions()
        } else if (currentBooking && currentBooking.status === 'confirmed') {
          // Check if this is an edit request
          const params = new URLSearchParams(window.location.search)
          if (params.get('edit') === 'true') {
            console.log('Edit mode requested, staying in management view')
            setStep(1)
          } else {
            console.log('Meeting already confirmed, showing confirmation view')
            setStep(3)
          }
        }
      }
    } catch (error) {
      console.error('Error checking auto-login:', error)
    }
  }

  if (!mounted) {
    return null
  }

  const connectCalendar = async (provider: 'google' | 'microsoft') => {
    setConnecting(true)
    
    // Redirect to OAuth flow
    window.location.href = `/api/auth/${provider}?token=${token}&email=auto&name=auto`
  }

  const confirmTime = async () => {
    if (!selectedTime) return
    
    setConfirming(true)
    
    try {
      const response = await fetch(`/api/bookings/${token}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestionId: selectedTime,
          recipientName: recipientInfo.name,
          recipientEmail: recipientInfo.email
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Reload booking data to get the confirmed time
        try {
          const bookingResponse = await fetch(`/api/bookings/${token}`)
          const bookingData = await bookingResponse.json()
          if (bookingData.booking) {
            setBooking(bookingData.booking)
          }
        } catch (error) {
          console.error('Error reloading booking data:', error)
        }
        setStep(3)
      }
    } catch (error) {
      console.error('Error confirming time:', error)
    } finally {
      setConfirming(false)
    }
  }

  const updateMeeting = async () => {
    setUpdating(true)
    try {
      let updateData = {
        title: editForm.title,
        description: editForm.description,
        duration: editForm.duration,
        meetingType: editForm.meetingType,
        meetingLink: editForm.meetingLink,
        phoneNumber: editForm.phoneNumber,
        address: editForm.address,
        meetingNotes: editForm.meetingNotes,
        invitees: invitees
      }
      
      // If time was changed, handle it separately via reschedule endpoint
      const originalTime = booking?.selectedTime ? new Date(booking.selectedTime) : null
      const newDateTime = editForm.newDate && editForm.newTime ? 
        new Date(`${editForm.newDate}T${editForm.newTime}:00`) : null
        
      const timeChanged = originalTime && newDateTime && 
        originalTime.getTime() !== newDateTime.getTime()
      
      if (timeChanged && newDateTime) {
        // First update the meeting details
        const updateResponse = await fetch(`/api/bookings/${token}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })
        
        if (!updateResponse.ok) {
          const errorData = await updateResponse.json()
          throw new Error(errorData.error || 'Failed to update meeting')
        }
        
        // Then update the time
        const rescheduleResponse = await fetch(`/api/bookings/${token}/reschedule`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newTime: newDateTime.toISOString()
          })
        })
        
        const rescheduleData = await rescheduleResponse.json()
        
        if (!rescheduleData.success) {
          throw new Error(rescheduleData.error || 'Failed to update meeting time')
        }
        
        // Refresh booking data
        await fetchBooking()
        setShowEditModal(false)
        alert('Meeting updated and rescheduled successfully!')
        
      } else {
        // Just update the meeting details
        const response = await fetch(`/api/bookings/${token}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })
        
        const data = await response.json()
        
        if (data.success) {
          // Refresh booking data
          await fetchBooking()
          setShowEditModal(false)
          
          // Show appropriate success message
          const message = data.message || 'Meeting updated successfully!'
          alert(message)
        } else {
          throw new Error(data.error || 'Failed to update meeting')
        }
      }
      
    } catch (error) {
      console.error('Error updating meeting:', error)
      alert(error instanceof Error ? error.message : 'Failed to update meeting')
    } finally {
      setUpdating(false)
    }
  }

  const deleteMeeting = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/bookings/${token}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('Meeting deleted successfully!')
        // Redirect to dashboard
        window.location.href = '/dashboard'
      } else {
        alert(data.error || 'Failed to delete meeting')
      }
    } catch (error) {
      console.error('Error deleting meeting:', error)
      alert('Failed to delete meeting')
    } finally {
      setDeleting(false)
    }
  }

  const addInvitee = () => {
    if (newInvitee.trim() && !invitees.includes(newInvitee.trim())) {
      setInvitees([...invitees, newInvitee.trim()])
      setNewInvitee('')
    }
  }

  const removeInvitee = (email: string) => {
    setInvitees(invitees.filter(inv => inv !== email))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Booking Not Found</h2>
          <p className="text-slate-600 mb-6">This booking link may be invalid or expired.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard" className="btn-primary">
              Back to Dashboard
            </Link>
            <Link href="/" className="btn-secondary">
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200 sticky top-0 bg-white z-50">
        <div className="container-width py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-semibold">Syncthesis</span>
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
          {/* Meeting Info Header - Always Visible */}
          <div className="card mb-6">
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{booking.title}</h1>
              {booking.description && (
                <p className="text-slate-600 mb-4">{booking.description}</p>
              )}
              <div className="flex justify-center items-center space-x-6 text-sm text-slate-600">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  <span>with <strong>{booking.creatorName}</strong></span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span><strong>{booking.duration}</strong> minutes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step Content */}
          {step === 1 && isOrganizer && (
            <div className="card">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  {booking.isGroupMeeting ? 'Manage Your Group Meeting' : 'Manage Your Meeting'}
                </h2>
                <p className="text-slate-600">
                  {booking.isGroupMeeting 
                    ? `Coordinate scheduling for ${groupStatus?.totalParticipants || booking.maxParticipants} participants. You can manage the group, reschedule, or view details.`
                    : 'This is your meeting. You can manage participants, reschedule, or view details.'
                  }
                </p>
              </div>

              {/* Meeting Details with Group Status */}
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-2">Meeting Details</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Status:</strong> <span className="capitalize">{booking.status}</span></div>
                  <div><strong>Type:</strong> <span className="capitalize">{booking.meetingType || 'video'}</span></div>
                  
                  {booking.isGroupMeeting ? (
                    <>
                      <div><strong>Group Meeting:</strong> {groupStatus?.totalParticipants || booking.maxParticipants} participants</div>
                      <div>
                        <strong>Calendar Connections:</strong> 
                        <span className={`ml-1 ${groupStatus?.allConnected ? 'text-green-600' : 'text-amber-600'}`}>
                          {groupStatus?.connectedParticipants || 1}/{groupStatus?.totalParticipants || booking.maxParticipants} connected
                        </span>
                      </div>
                      {booking.participantDeadline && (
                        <div>
                          <strong>Deadline:</strong> 
                          <span className={`ml-1 ${new Date() > new Date(booking.participantDeadline) ? 'text-red-600' : 'text-blue-600'}`}>
                            {formatDateTime(new Date(booking.participantDeadline))}
                          </span>
                        </div>
                      )}
                      {booking.autoSelectAtDeadline && (
                        <div className="text-purple-600"><strong>Auto-Schedule:</strong> AI will select time at deadline</div>
                      )}
                    </>
                  ) : (
                    <>
                      {booking.recipientEmail ? (
                        <div><strong>Recipient:</strong> {booking.recipientName || booking.recipientEmail}</div>
                      ) : (
                        <div className="text-amber-600"><strong>Status:</strong> Waiting for recipient to connect calendar</div>
                      )}
                    </>
                  )}
                  
                  {booking.selectedTime && (
                    <div><strong>Scheduled:</strong> {formatDateTime(new Date(booking.selectedTime))}</div>
                  )}
                </div>
              </div>

              {/* Management Action Buttons */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="btn-secondary flex items-center"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Meeting
                </button>
                
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Meeting
                </button>
              </div>
              
              <div className="space-y-3">
                {/* Group Meeting Status or Regular Meeting Status */}
                {booking.isGroupMeeting ? (
                  <div className="space-y-4">
                    {/* Group Meeting Progress */}
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-purple-800">👥 Group Coordination Progress</h4>
                        <span className="text-sm text-purple-600">
                          {groupStatus?.connectedParticipants || 1}/{groupStatus?.totalParticipants || booking.maxParticipants} ready
                        </span>
                      </div>
                      
                      {groupStatus?.allConnected ? (
                        <div className="bg-green-100 border border-green-300 rounded p-3 mb-3">
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                            <span className="text-green-800 font-medium">All participants connected! Ready to select time.</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-100 border border-amber-300 rounded p-3 mb-3">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 text-amber-600 mr-2" />
                            <span className="text-amber-800 font-medium">
                              Waiting for {(groupStatus?.totalParticipants || booking.maxParticipants) - (groupStatus?.connectedParticipants || 1)} more participant(s)
                            </span>
                          </div>
                          {booking.participantDeadline && (
                            <div className="text-amber-700 text-sm mt-2">
                              ⏰ Deadline: {formatDateTime(new Date(booking.participantDeadline))}
                              {booking.autoSelectAtDeadline && ' (AI will auto-select time)'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Share Link for Group */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-blue-800 text-sm">
                        <strong>Share this link</strong> with participants who haven't connected yet:
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <code className="flex-1 text-left text-xs bg-white px-3 py-2 rounded border">
                          {window.location.href}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(window.location.href)}
                          className="btn-secondary text-xs px-3 py-2"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Regular 1-on-1 meeting
                  booking.status === 'pending' && !booking.recipientEmail && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-blue-800 text-sm">
                        <strong>Share this link</strong> with your recipient so they can connect their calendar and choose a time:
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <code className="flex-1 text-left text-xs bg-white px-3 py-2 rounded border">
                          {window.location.href}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(window.location.href)}
                          className="btn-secondary text-xs px-3 py-2"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )
                )}

                {booking.status === 'confirmed' && (
                  <button
                    onClick={() => setShowRescheduleOptions(true)}
                    className="btn-primary w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reschedule Meeting
                  </button>
                )}

              </div>

              {/* Reschedule Options */}
              {showRescheduleOptions && (
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">🚀 Smart Rescheduling</h4>
                  <p className="text-yellow-700 text-sm mb-3">
                    Our AI will analyze both calendars again to find new optimal times that work for everyone.
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={async () => {
                        setRescheduleLoading(true)
                        try {
                          const response = await fetch(`/api/bookings/${token}/reschedule`, {
                            method: 'POST'
                          })
                          const data = await response.json()
                          
                          if (data.suggestedTimes) {
                            setRescheduleOptions(data.suggestedTimes)
                          }
                        } catch (error) {
                          console.error('Error fetching reschedule options:', error)
                          alert('Failed to generate reschedule options')
                        } finally {
                          setRescheduleLoading(false)
                        }
                      }}
                      disabled={rescheduleLoading}
                      className="btn-primary"
                    >
                      {rescheduleLoading ? 'Analyzing Calendars...' : 'Find New Times'}
                    </button>
                    <button
                      onClick={() => {
                        setShowRescheduleOptions(false)
                        setRescheduleOptions([])
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Show reschedule options */}
                  {rescheduleOptions.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h5 className="font-medium text-slate-900">🎯 AI-Suggested Times:</h5>
                      {rescheduleOptions.map((option, index) => (
                        <button
                          key={index}
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/bookings/${token}/reschedule`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  newTime: option.start,
                                  endTime: option.end
                                })
                              })
                              
                              const data = await response.json()
                              
                              if (data.success) {
                                // Refresh the booking data
                                await fetchBooking()
                                setShowRescheduleOptions(false)
                                setRescheduleOptions([])
                                alert('Meeting rescheduled successfully!')
                              } else {
                                alert(data.error || 'Failed to reschedule meeting')
                              }
                            } catch (error) {
                              console.error('Error rescheduling:', error)
                              alert('Failed to reschedule meeting')
                            }
                          }}
                          className="w-full text-left p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-400 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{formatDateTime(new Date(option.start))}</div>
                              <div className="text-sm text-slate-600">{option.description}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-blue-600 font-medium">{option.confidence}% match</div>
                              <div className="text-xs text-slate-500">Rank #{option.rank}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 1 && !isOrganizer && (
            <div className="card text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Connect Your Calendar</h2>
                <p className="text-slate-600">
                  Connect your calendar to see available times that work for both you and {booking.creatorName}
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-2 text-blue-800">🚀 Syncthesis Magic</h3>
                <p className="text-blue-700 text-sm mb-3">
                  Our AI will analyze both your calendar and {booking.creatorName}'s calendar to find 
                  perfect meeting times that work for everyone.
                </p>
                <div className="bg-yellow-100 rounded p-3 text-yellow-800 text-xs">
                  <strong>Unlike other tools:</strong> No preset time slots. True mutual availability!
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => connectCalendar('google')}
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
                    <div className="text-xs text-slate-600">Connect to see times</div>
                  </div>
                </button>
                <button
                  onClick={() => connectCalendar('microsoft')}
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
                  🔒 Your calendar data is never stored. We only analyze availability in real-time.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card">
              {loadingSuggestions ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Finding Perfect Meeting Times...</h2>
                  <p className="text-slate-600">
                    Our AI is analyzing both calendars to find optimal mutual availability
                  </p>
                </div>
              ) : suggestionsError ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                    <Calendar className="h-8 w-8 text-red-600" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Calendar Access Issue</h2>
                  <p className="text-slate-600 mb-4">{suggestionsError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="btn-secondary mr-3"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => {
                      setStep(1)
                      setSuggestionsError(null)
                    }}
                    className="btn-primary"
                  >
                    Reconnect Calendar
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-semibold mb-4">🚀 AI-Suggested Meeting Times</h2>
                  <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <p className="text-blue-800 text-sm">
                      <strong>Syncthesis Magic:</strong> Our AI analyzed both your calendar and {booking.creatorName}'s calendar 
                      to find these optimal mutual times. Each suggestion includes buffer time and avoids scheduling conflicts.
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => setSelectedTime(suggestion.id)}
                        className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                          selectedTime === suggestion.id
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-slate-300 hover:border-blue-400'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <div className="font-medium">
                                {formatDateTime(new Date(suggestion.startTime))}
                              </div>
                              {suggestion.isBestMatch && (
                                <span className="text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-1 rounded-full font-medium">
                                  ⭐ Best Match
                                </span>
                              )}
                            </div>
                            
                            {suggestion.contextLabel && (
                              <div className="text-sm text-blue-600 font-medium mb-1">
                                {suggestion.contextLabel.replace('⭐ Best Match - ', '')}
                              </div>
                            )}
                            
                            <div className="text-sm text-slate-600 mb-2">
                              Duration: {booking.duration} minutes
                            </div>
                            
                            {suggestion.reasoning && (
                              <div className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1">
                                💡 {suggestion.reasoning}
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right ml-4">
                            {suggestion.score > 0.85 && !suggestion.isBestMatch && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full mb-1 block">
                                ✨ Great Option
                              </span>
                            )}
                            <div className="text-xs text-slate-500">
                              AI Score: {Math.round(suggestion.score * 100)}%
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={confirmTime}
                    disabled={!selectedTime || confirming}
                    className="btn-primary w-full"
                  >
                    {confirming ? 'Confirming...' : 'Confirm Meeting Time'}
                  </button>
                </>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="card text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-4">🎉 Meeting Confirmed!</h2>
              <p className="text-slate-600 mb-6">
                The meeting has been added to both calendars. 
                You'll receive a calendar invitation shortly.
              </p>
              
              <div className="bg-slate-50 rounded-lg p-4 text-left mb-6">
                <h3 className="font-semibold mb-2">Meeting Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                    <span>{booking.title}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-blue-600" />
                    <span>
                      {booking.selectedTime ? 
                        formatDateTime(new Date(booking.selectedTime)) : 
                        'Time to be confirmed'
                      }
                    </span>
                  </div>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-blue-600" />
                    <span>With {booking.creatorName}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <p className="text-blue-800 text-sm">
                  <strong>✨ Syncthesis Success:</strong> Your meeting was automatically added to both calendars 
                  with optimal timing that respects both your schedules. No back-and-forth needed!
                </p>
              </div>

              {isOrganizer && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="btn-primary flex items-center justify-center"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Meeting
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Edit Meeting Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Edit Meeting</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Meeting Title
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter meeting title"
                  />
                </div>
                
                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Meeting description..."
                  />
                </div>
                
                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Duration (minutes)
                  </label>
                  <select
                    value={editForm.duration}
                    onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
                
                {/* Meeting Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Meeting Type
                  </label>
                  <select
                    value={editForm.meetingType}
                    onChange={(e) => setEditForm({ ...editForm, meetingType: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="video">Video Call</option>
                    <option value="phone">Phone Call</option>
                    <option value="in-person">In-Person</option>
                  </select>
                </div>
                
                {/* Meeting Location Details */}
                {editForm.meetingType === 'video' && (
                  <div>
                    <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
                      <Video className="h-4 w-4 mr-2" />
                      Video Meeting Link
                    </label>
                    <input
                      type="url"
                      value={editForm.meetingLink}
                      onChange={(e) => setEditForm({ ...editForm, meetingLink: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://zoom.us/j/your-meeting-id"
                    />
                  </div>
                )}
                
                {editForm.meetingType === 'phone' && (
                  <div>
                    <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
                      <Phone className="h-4 w-4 mr-2" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editForm.phoneNumber}
                      onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                )}
                
                {editForm.meetingType === 'in-person' && (
                  <div>
                    <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
                      <MapPin className="h-4 w-4 mr-2" />
                      Meeting Address
                    </label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="123 Main St, City, State 12345"
                    />
                  </div>
                )}
                
                {/* Meeting Time */}
                {booking.selectedTime && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Current Meeting Time
                    </label>
                    <div className="bg-slate-50 p-3 rounded-lg mb-2">
                      <div className="text-sm font-medium">
                        {formatDateTime(new Date(booking.selectedTime))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          New Date
                        </label>
                        <input
                          type="date"
                          value={editForm.newDate || new Date(booking.selectedTime).toISOString().split('T')[0]}
                          onChange={(e) => setEditForm({ ...editForm, newDate: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          New Time
                        </label>
                        <input
                          type="time"
                          value={editForm.newTime || new Date(booking.selectedTime).toTimeString().slice(0, 5)}
                          onChange={(e) => setEditForm({ ...editForm, newTime: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Meeting Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Meeting Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.meetingNotes}
                    onChange={(e) => setEditForm({ ...editForm, meetingNotes: e.target.value })}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional notes or instructions..."
                  />
                </div>
                
                {/* Invitees Management */}
                <div>
                  <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
                    <UsersIcon className="h-4 w-4 mr-2" />
                    Invitees
                  </label>
                  
                  {/* Current Invitees */}
                  <div className="space-y-2 mb-3">
                    {invitees.map((email, index) => (
                      <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                        <span className="text-sm">{email}</span>
                        <button
                          onClick={() => removeInvitee(email)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Add New Invitee */}
                  <div className="flex space-x-2">
                    <input
                      type="email"
                      value={newInvitee}
                      onChange={(e) => setNewInvitee(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addInvitee()}
                      className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email address"
                    />
                    <button
                      onClick={addInvitee}
                      className="btn-secondary flex items-center"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Add
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-6 border-t border-slate-200 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={updateMeeting}
                  disabled={updating}
                  className="btn-primary flex-1 flex items-center justify-center"
                >
                  {updating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {updating ? 'Updating...' : 'Update Meeting'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-red-600">Delete Meeting</h2>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <Trash2 className="h-5 w-5 text-red-600 mr-2" />
                    <p className="text-red-800 font-medium">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-slate-700">
                  Are you sure you want to delete "<strong>{booking.title}</strong>"? 
                  This will permanently remove the meeting and all associated data.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteMeeting}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex-1 flex items-center justify-center"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  {deleting ? 'Deleting...' : 'Delete Meeting'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}