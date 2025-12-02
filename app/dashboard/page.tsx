'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Calendar, 
  Clock, 
  Users, 
  Settings, 
  Plus, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Star,
  Zap,
  Crown,
  LogOut,
  User,
  Video,
  Phone,
  MapPin,
  Save,
  Loader2,
  Eye,
  Edit,
  Send,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  MessageCircle,
  X,
  XCircle
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { getTierFeatures, TIER_PRICING, hasAccess, getUpgradeMessage } from '@/lib/tiers'

interface Booking {
  id: string
  title: string
  description?: string
  creatorName: string
  creatorEmail: string
  recipientName?: string
  recipientEmail?: string
  selectedTime?: string
  duration: number
  status: string
  meetingType: string
  meetingLink?: string
  phoneNumber?: string
  address?: string
  meetingNotes?: string
  isGroupMeeting: boolean
  isRecurring: boolean
  participantCount?: number
  shareToken: string
  createdAt: string
}

interface UserStats {
  totalMeetings: number
  confirmedMeetings: number
  pendingMeetings: number
  groupMeetings: number
  recurringMeetings: number
}

interface UserProfile {
  id: string
  name: string
  email: string
  plan: string
  username?: string
  firstName?: string
  lastName?: string
  defaultVideoLink?: string
  defaultPhoneNumber?: string
  defaultAddress?: string
  defaultMeetingNotes?: string
}

interface UserPreferences {
  id?: string
  earliestStartTime: string
  latestEndTime: string
  preferredDays: string
  avoidDays?: string
  bufferMinutes: number
  allowBackToBack: boolean
  blockLunchBreak: boolean
  lunchBreakStart: string
  lunchBreakEnd: string
  preferredMeetingType: string
  allowSameDayScheduling: boolean
  minimumNoticeHours: number
}

const DAYS_OF_WEEK = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '7', label: 'Sunday' },
]

export default function Dashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState<UserStats>({
    totalMeetings: 0,
    confirmedMeetings: 0,
    pendingMeetings: 0,
    groupMeetings: 0,
    recurringMeetings: 0
  })
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('recent')
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    earliestStartTime: '09:00',
    latestEndTime: '17:00',
    preferredDays: '1,2,3,4,5',
    avoidDays: '',
    bufferMinutes: 15,
    allowBackToBack: false,
    blockLunchBreak: false,
    lunchBreakStart: '12:00',
    lunchBreakEnd: '13:00',
    preferredMeetingType: 'video',
    allowSameDayScheduling: false,
    minimumNoticeHours: 24
  })

  const [profileDefaults, setProfileDefaults] = useState({
    defaultVideoLink: '',
    defaultPhoneNumber: '',
    defaultAddress: '',
    defaultMeetingNotes: ''
  })
  
  // New state for enhanced dashboard
  const [showPendingOnly, setShowPendingOnly] = useState(false)
  const [showMoreMeetings, setShowMoreMeetings] = useState(false)
  const [showGuidance, setShowGuidance] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState({ earlier: true })
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
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
  const [updating, setUpdating] = useState(false)
  const [showAISuggestions, setShowAISuggestions] = useState(false)
  const [aiSuggestions, setAISuggestions] = useState<any[]>([])
  const [loadingAISuggestions, setLoadingAISuggestions] = useState(false)
  const [usernameForm, setUsernameForm] = useState({ username: '' })
  const [usernameCheck, setUsernameCheck] = useState<{
    checking: boolean
    available: boolean | null
    error: string | null
    suggestions: string[]
    preview: string | null
  }>({
    checking: false,
    available: null,
    error: null,
    suggestions: [],
    preview: null
  })

  useEffect(() => {
    // Check authentication first
    checkAuthAndLoadData()
    
    // Refresh data when navigating back to dashboard
    const handleFocus = () => {
      checkAuthAndLoadData()
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Debounced username validation
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (usernameForm.username) {
        checkUsernameAvailability(usernameForm.username)
      } else {
        setUsernameCheck({
          checking: false,
          available: null,
          error: null,
          suggestions: [],
          preview: null
        })
      }
    }, 500) // Wait 500ms after user stops typing
    
    return () => clearTimeout(timeoutId)
  }, [usernameForm.username])
  
  const checkAuthAndLoadData = async () => {
    try {
      const response = await fetch('/api/profile')
      
      if (response.status === 401) {
        // Not authenticated - redirect to login
        window.location.href = '/login?redirect=/dashboard'
        return
      }
      
      const data = await response.json()
      
      if (!data.profile) {
        // No profile found - redirect to login
        window.location.href = '/login?redirect=/dashboard'
        return
      }
      
      // User is authenticated, load dashboard data
      loadDashboardData()
      
    } catch (error) {
      console.error('Error checking authentication:', error)
      // On error, redirect to login
      window.location.href = '/login?redirect=/dashboard'
    }
  }

  const loadDashboardData = async () => {
    try {
      // Load profile
      const profileResponse = await fetch('/api/profile')
      const profileData = await profileResponse.json()
      if (profileData.profile) {
        setProfile(profileData.profile)
        setProfileDefaults({
          defaultVideoLink: profileData.profile.defaultVideoLink || '',
          defaultPhoneNumber: profileData.profile.defaultPhoneNumber || '',
          defaultAddress: profileData.profile.defaultAddress || '',
          defaultMeetingNotes: profileData.profile.defaultMeetingNotes || ''
        })
      }
      
      if (profileData.preferences) {
        setPreferences(profileData.preferences)
      }

      // Load real user bookings
      const bookingsResponse = await fetch('/api/bookings/user')
      const bookingsData = await bookingsResponse.json()
      
      console.log('Loaded real bookings:', bookingsData)
      
      if (bookingsData.bookings) {
        setBookings(bookingsData.bookings)
        setStats(bookingsData.stats)
      } else {
        // Fallback to empty state
        setBookings([])
        setStats({
          totalMeetings: 0,
          confirmedMeetings: 0,
          pendingMeetings: 0,
          groupMeetings: 0,
          recurringMeetings: 0
        })
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      // Fallback to empty state on error
      setBookings([])
      setStats({
        totalMeetings: 0,
        confirmedMeetings: 0,
        pendingMeetings: 0,
        groupMeetings: 0,
        recurringMeetings: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      // Clear browser storage immediately
      localStorage.clear()
      sessionStorage.clear()
      
      // Set logout flag
      localStorage.setItem('logged_out', 'true')
      
      await fetch('/api/auth/logout', { method: 'POST' })
      
      // Redirect to home page with logout flag
      window.location.href = '/?logged_out=true'
    } catch (error) {
      console.error('Error logging out:', error)
      // Still redirect even if logout API fails
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/?logged_out=true'
    }
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileDefaults,
          preferences
        })
      })

      if (response.ok) {
        // Show success message
        alert('Settings saved successfully!')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // Helper functions for enhanced dashboard
  const groupMeetingsByTime = (bookings: Booking[]) => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    return {
      today: bookings.filter(b => new Date(b.createdAt) >= todayStart),
      thisWeek: bookings.filter(b => {
        const created = new Date(b.createdAt)
        return created < todayStart && created >= weekAgo
      }),
      earlier: bookings.filter(b => new Date(b.createdAt) < weekAgo)
    }
  }

  const getTimeAwareStatus = (booking: Booking) => {
    const now = new Date()
    const created = new Date(booking.createdAt)
    const hoursAgo = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60))
    
    if (booking.status === 'confirmed') return 'Confirmed'
    if (booking.recipientName) return 'Calendar connected'
    
    if (hoursAgo < 2) return 'Sent recently'
    if (hoursAgo < 24) return `Sent ${hoursAgo}h ago`
    const daysAgo = Math.floor(hoursAgo / 24)
    if (daysAgo === 1) return 'Sent yesterday'
    if (daysAgo < 7) return `Sent ${daysAgo}d ago`
    return `Sent ${daysAgo}d ago - consider follow up`
  }

  const handleMeetingAction = async (action: string, booking: Booking) => {
    switch (action) {
      case 'view':
        setSelectedBooking(booking)
        setShowViewModal(true)
        break
      case 'edit':
        // Open edit modal directly in dashboard
        setSelectedBooking(booking)
        const selectedTime = booking.selectedTime ? new Date(booking.selectedTime) : null
        
        // Reset all modal states first
        setShowAISuggestions(false)
        setAISuggestions([])
        
        // Set form data
        setEditForm({
          title: booking.title || '',
          description: booking.description || '',
          duration: booking.duration || 30,
          meetingType: booking.meetingType || 'video',
          meetingLink: booking.meetingLink || '',
          phoneNumber: booking.phoneNumber || '',
          address: booking.address || '',
          meetingNotes: booking.meetingNotes || '',
          newDate: selectedTime ? selectedTime.toISOString().split('T')[0] : '',
          newTime: selectedTime ? selectedTime.toTimeString().slice(0, 5) : ''
        })
        
        // Open modal with slight delay to ensure state is clean
        setTimeout(() => setShowEditModal(true), 10)
        break
      case 'resend':
        try {
          const shareLink = `${window.location.origin}/book/${booking.shareToken}`
          const recipientEmail = booking.recipientEmail || prompt('Enter recipient email to resend invite:')
          
          if (!recipientEmail) {
            alert('Recipient email is required')
            return
          }
          
          const response = await fetch('/api/bookings/send-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shareLink,
              recipientEmail,
              creatorName: booking.creatorName,
              meetingTitle: booking.title
            })
          })
          
          const result = await response.json()
          
          if (result.success) {
            alert('Meeting invite resent successfully!')
          } else {
            alert(result.error || 'Failed to resend invite')
          }
        } catch (error) {
          console.error('Error resending invite:', error)
          alert('Failed to resend invite')
        }
        break
      case 'copy':
        const link = `${window.location.origin}/book/${booking.shareToken}`
        navigator.clipboard.writeText(link)
        alert('Meeting link copied!')
        break
      case 'cancel':
        if (confirm(`Are you sure you want to cancel "${booking.title}"? This action cannot be undone.`)) {
          try {
            const response = await fetch(`/api/bookings/${booking.shareToken}`, {
              method: 'DELETE'
            })
            if (response.ok) {
              alert('Meeting cancelled successfully')
              checkAuthAndLoadData() // Refresh the list
            } else {
              alert('Failed to cancel meeting')
            }
          } catch (error) {
            console.error('Error cancelling meeting:', error)
            alert('Failed to cancel meeting')
          }
        }
        break
    }
  }

  const updateMeeting = async () => {
    if (!selectedBooking) return
    
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
        meetingNotes: editForm.meetingNotes
      }
      
      // If time was changed, handle it separately via reschedule endpoint
      const originalTime = selectedBooking.selectedTime ? new Date(selectedBooking.selectedTime) : null
      const newDateTime = editForm.newDate && editForm.newTime ? 
        new Date(`${editForm.newDate}T${editForm.newTime}:00`) : null
        
      const timeChanged = originalTime && newDateTime && 
        originalTime.getTime() !== newDateTime.getTime()
      
      if (timeChanged && newDateTime) {
        // First update the meeting details
        const updateResponse = await fetch(`/api/bookings/${selectedBooking.shareToken}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })
        
        if (!updateResponse.ok) {
          const errorData = await updateResponse.json()
          throw new Error(errorData.error || 'Failed to update meeting')
        }
        
        // Then update the time
        const rescheduleResponse = await fetch(`/api/bookings/${selectedBooking.shareToken}/reschedule`, {
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
        
        alert('Meeting updated and rescheduled successfully!')
        
      } else {
        // Just update the meeting details
        const response = await fetch(`/api/bookings/${selectedBooking.shareToken}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })
        
        const data = await response.json()
        
        if (data.success) {
          alert('Meeting updated successfully!')
        } else {
          throw new Error(data.error || 'Failed to update meeting')
        }
      }
      
      // Refresh the booking list and close modal
      checkAuthAndLoadData()
      setShowEditModal(false)
      setSelectedBooking(null)
      
    } catch (error) {
      console.error('Error updating meeting:', error)
      alert(error instanceof Error ? error.message : 'Failed to update meeting')
    } finally {
      setUpdating(false)
    }
  }

  const fetchAISuggestions = async () => {
    if (!selectedBooking) return
    
    setLoadingAISuggestions(true)
    try {
      const response = await fetch(`/api/bookings/${selectedBooking.shareToken}/reschedule`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success && data.suggestedTimes) {
        setAISuggestions(data.suggestedTimes)
        setShowAISuggestions(true)
      } else {
        alert(data.error || 'Failed to generate AI suggestions')
      }
    } catch (error) {
      console.error('Error fetching AI suggestions:', error)
      alert('Failed to generate AI suggestions')
    } finally {
      setLoadingAISuggestions(false)
    }
  }

  const selectAISuggestion = async (suggestion: any) => {
    if (!selectedBooking) return
    
    setUpdating(true)
    try {
      const response = await fetch(`/api/bookings/${selectedBooking.shareToken}/reschedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newTime: suggestion.start,
          endTime: suggestion.end
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('Meeting rescheduled successfully with AI-suggested time!')
        checkAuthAndLoadData() // Refresh the list
        setShowEditModal(false)
        setShowAISuggestions(false)
        setSelectedBooking(null)
        setAISuggestions([])
      } else {
        alert(data.error || 'Failed to reschedule meeting')
      }
    } catch (error) {
      console.error('Error selecting AI suggestion:', error)
      alert('Failed to reschedule meeting')
    } finally {
      setUpdating(false)
    }
  }

  // Username validation function
  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameCheck({
        checking: false,
        available: null,
        error: null,
        suggestions: [],
        preview: null
      })
      return
    }
    
    setUsernameCheck(prev => ({ ...prev, checking: true }))
    
    try {
      const response = await fetch('/api/account/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      })
      
      const data = await response.json()
      
      setUsernameCheck({
        checking: false,
        available: data.available,
        error: data.error || null,
        suggestions: data.suggestions || [],
        preview: data.preview || null
      })
    } catch (error) {
      console.error('Error checking username:', error)
      setUsernameCheck({
        checking: false,
        available: false,
        error: 'Failed to check availability',
        suggestions: [],
        preview: null
      })
    }
  }

  const tierFeatures = profile ? getTierFeatures(profile.plan as any) : null
  const currentPlan = profile?.plan || 'free'
  const canUsePreferences = profile ? hasAccess(profile.plan as any, 'preferenceEngine') : false
  const canUseDefaults = profile ? hasAccess(profile.plan as any, 'profileDefaults') : false

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container-width py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-semibold">Syncthesis</span>
          </Link>
          <div className="flex items-center space-x-3">
            <Link href="/create" className="btn-primary flex items-center whitespace-nowrap">
              <Plus className="h-4 w-4 mr-1" />
              New Meeting
            </Link>
            <button 
              onClick={handleLogout}
              className="btn-secondary flex items-center whitespace-nowrap text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-1" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container-width py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">
                Welcome back, {profile?.name || 'User'}!
              </h1>
              <p className="text-slate-600 mt-1">
                Manage your meetings and scheduling preferences
              </p>
            </div>
            
            {/* Plan Badge */}
            <div className="flex items-center space-x-3">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                currentPlan === 'super_admin' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' :
                currentPlan === 'coaching' ? 'bg-purple-100 text-purple-800' :
                currentPlan === 'business' ? 'bg-blue-100 text-blue-800' :
                currentPlan === 'professional' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {(currentPlan === 'coaching' || currentPlan === 'super_admin') && <Crown className="h-4 w-4 mr-1" />}
                {currentPlan === 'super_admin' ? 'Super Admin' : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan
              </div>
              <Link href="/account" className="btn-primary text-sm whitespace-nowrap flex items-center">
                <User className="h-4 w-4 mr-1" />
                Manage Account
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Meetings</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalMeetings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Confirmed</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.confirmedMeetings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-amber-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Pending</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.pendingMeetings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Group Meetings</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.groupMeetings}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <div className="flex items-center">
                <RefreshCw className="h-8 w-8 text-indigo-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Recurring</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.recurringMeetings}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Tabs */}
          <div className="border-b border-slate-200 mb-8">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('recent')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'recent'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Recent Meetings
              </button>
              <button
                onClick={() => setActiveTab('defaults')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'defaults'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Meeting Defaults
              </button>
              <button
                onClick={() => setActiveTab('preferences')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'preferences'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Time Preferences
              </button>
            </nav>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Meetings Tab - Enhanced with time-based groupings */}
            {activeTab === 'recent' && (
              <div className="lg:col-span-2 space-y-6">
                
                {/* Pending Meeting Guidance */}
                {stats.pendingMeetings > 0 && (
                  <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <HelpCircle className="h-5 w-5 text-amber-600 mr-2" />
                        <span className="font-medium text-amber-800">Need help with pending meetings?</span>
                      </div>
                      <button
                        onClick={() => setShowGuidance(!showGuidance)}
                        className="text-amber-600 hover:text-amber-700"
                      >
                        {showGuidance ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                    
                    {showGuidance && (
                      <div className="mt-3 text-sm text-amber-700 space-y-2">
                        <p>• Recipients need to connect their calendars to see available times</p>
                        <p>• Try following up with recipients who haven't responded</p>
                        <p>• Share the meeting link again if needed</p>
                        {currentPlan === 'free' && (
                          <p>• <Link href="/upgrade" className="underline">Upgrade to Pro</Link> for automated follow-up features</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Filter Toggle */}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-slate-900">Your Meetings</h2>
                  <button
                    onClick={() => setShowPendingOnly(!showPendingOnly)}
                    className={`btn-secondary text-sm flex items-center whitespace-nowrap ${showPendingOnly ? 'bg-blue-50 text-blue-700 border-blue-300' : ''}`}
                  >
                    <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{showPendingOnly ? 'Show All' : 'Pending Only'}</span>
                  </button>
                </div>
                
                {(() => {
                  const filteredBookings = showPendingOnly ? bookings.filter(b => b.status === 'pending') : bookings
                  const groupedMeetings = groupMeetingsByTime(filteredBookings)
                  const maxInitialMeetings = 8
                  
                  // Determine how many meetings to show based on showMoreMeetings state
                  const meetingsToShow = showMoreMeetings ? filteredBookings.length : maxInitialMeetings
                  let shownCount = 0
                  
                  return (
                    <div className="space-y-6">
                      {/* Today's Meetings */}
                      {groupedMeetings.today.length > 0 && (
                        <div className="bg-white rounded-lg border border-slate-200">
                          <div className="px-6 py-4 border-b border-slate-200">
                            <h3 className="font-semibold text-slate-900">Today ({groupedMeetings.today.length})</h3>
                          </div>
                          <div className="divide-y divide-slate-200">
                            {groupedMeetings.today.filter((_, index) => {
                              if (shownCount >= meetingsToShow) return false
                              shownCount++
                              return true
                            }).map((booking) => (
                              <div key={booking.id} className={`p-4 ${
                                booking.status === 'confirmed' ? 'border-l-4 border-green-500 bg-green-50' :
                                booking.recipientName ? 'bg-blue-50' : ''
                              }`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <h4 className="font-medium text-slate-900">{booking.title}</h4>
                                      {booking.meetingType === 'video' && <Video className="h-4 w-4 text-blue-500" />}
                                      {booking.meetingType === 'phone' && <Phone className="h-4 w-4 text-green-500" />}
                                      {booking.meetingType === 'in-person' && <MapPin className="h-4 w-4 text-red-500" />}
                                      {booking.isGroupMeeting && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                          <Users className="h-3 w-3 mr-1" />
                                          Group
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center space-x-4 text-sm text-slate-600 mb-1">
                                      <span>{booking.duration} min</span>
                                      {booking.selectedTime ? (
                                        <span className="font-medium text-green-700">{formatDateTime(new Date(booking.selectedTime))}</span>
                                      ) : (
                                        <span className="text-amber-600">Time not selected</span>
                                      )}
                                    </div>
                                    
                                    <p className="text-sm text-slate-600">
                                      {booking.recipientName ? (
                                        <>with {booking.recipientName}</>
                                      ) : (
                                        <span className="text-amber-600">{getTimeAwareStatus(booking)}</span>
                                      )}
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={(e) => { e.preventDefault(); handleMeetingAction('view', booking) }}
                                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                      title="View"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.preventDefault(); handleMeetingAction('edit', booking) }}
                                      className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                      title="Edit"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.preventDefault(); handleMeetingAction('resend', booking) }}
                                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                      title="Resend Invite"
                                    >
                                      <Send className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.preventDefault(); handleMeetingAction('copy', booking) }}
                                      className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                      title="Copy Link"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.preventDefault(); handleMeetingAction('cancel', booking) }}
                                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="Cancel"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* This Week's Meetings */}
                      {groupedMeetings.thisWeek.length > 0 && (
                        <div className="bg-white rounded-lg border border-slate-200">
                          <div className="px-6 py-4 border-b border-slate-200">
                            <h3 className="font-semibold text-slate-900">This Week ({groupedMeetings.thisWeek.length})</h3>
                          </div>
                          <div className="divide-y divide-slate-200">
                            {groupedMeetings.thisWeek.filter((_, index) => {
                              if (shownCount >= meetingsToShow) return false
                              shownCount++
                              return true
                            }).map((booking) => (
                              <div key={booking.id} className={`p-4 ${
                                booking.status === 'confirmed' ? 'border-l-4 border-green-500 bg-green-50' :
                                booking.recipientName ? 'bg-blue-50' : ''
                              }`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <h4 className="font-medium text-slate-900">{booking.title}</h4>
                                      {booking.meetingType === 'video' && <Video className="h-4 w-4 text-blue-500" />}
                                      {booking.meetingType === 'phone' && <Phone className="h-4 w-4 text-green-500" />}
                                      {booking.meetingType === 'in-person' && <MapPin className="h-4 w-4 text-red-500" />}
                                      {booking.isGroupMeeting && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                          <Users className="h-3 w-3 mr-1" />
                                          Group
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center space-x-4 text-sm text-slate-600 mb-1">
                                      <span>{booking.duration} min</span>
                                      {booking.selectedTime ? (
                                        <span className="font-medium text-green-700">{formatDateTime(new Date(booking.selectedTime))}</span>
                                      ) : (
                                        <span className="text-amber-600">Time not selected</span>
                                      )}
                                    </div>
                                    
                                    <p className="text-sm text-slate-600">
                                      {booking.recipientName ? (
                                        <>with {booking.recipientName}</>
                                      ) : (
                                        <span className="text-amber-600">{getTimeAwareStatus(booking)}</span>
                                      )}
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={(e) => { e.preventDefault(); handleMeetingAction('view', booking) }}
                                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                      title="View"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.preventDefault(); handleMeetingAction('edit', booking) }}
                                      className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                                      title="Edit"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.preventDefault(); handleMeetingAction('resend', booking) }}
                                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                      title="Resend Invite"
                                    >
                                      <Send className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.preventDefault(); handleMeetingAction('copy', booking) }}
                                      className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                      title="Copy Link"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.preventDefault(); handleMeetingAction('cancel', booking) }}
                                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title="Cancel"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Earlier Meetings (Collapsible) */}
                      {groupedMeetings.earlier.length > 0 && (
                        <div className="bg-white rounded-lg border border-slate-200">
                          <div className="px-6 py-4 border-b border-slate-200">
                            <button
                              onClick={() => setCollapsedSections(prev => ({ ...prev, earlier: !prev.earlier }))}
                              className="flex items-center justify-between w-full text-left"
                            >
                              <h3 className="font-semibold text-slate-900">Earlier ({groupedMeetings.earlier.length})</h3>
                              {collapsedSections.earlier ? 
                                <ChevronDown className="h-4 w-4 text-slate-400" /> : 
                                <ChevronUp className="h-4 w-4 text-slate-400" />
                              }
                            </button>
                          </div>
                          
                          {!collapsedSections.earlier && (
                            <div className="divide-y divide-slate-200">
                              {groupedMeetings.earlier.filter((_, index) => {
                                if (shownCount >= meetingsToShow) return false
                                shownCount++
                                return true
                              }).map((booking) => (
                                <div key={booking.id} className={`p-4 opacity-75 ${
                                  booking.status === 'confirmed' ? 'border-l-4 border-green-500 bg-green-50' :
                                  booking.recipientName ? 'bg-blue-50' : 'bg-gray-50'
                                }`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <h4 className="font-medium text-slate-700">{booking.title}</h4>
                                        {booking.meetingType === 'video' && <Video className="h-4 w-4 text-blue-500" />}
                                        {booking.meetingType === 'phone' && <Phone className="h-4 w-4 text-green-500" />}
                                        {booking.meetingType === 'in-person' && <MapPin className="h-4 w-4 text-red-500" />}
                                      </div>
                                      
                                      <div className="flex items-center space-x-4 text-sm text-slate-500 mb-1">
                                        <span>{booking.duration} min</span>
                                        {booking.selectedTime ? (
                                          <span className="font-medium text-green-600">{formatDateTime(new Date(booking.selectedTime))}</span>
                                        ) : (
                                          <span className="text-amber-600">Time not selected</span>
                                        )}
                                      </div>
                                      
                                      <p className="text-sm text-slate-500">
                                        {booking.recipientName ? (
                                          <>with {booking.recipientName}</>
                                        ) : (
                                          <span className="text-red-500 font-medium">{getTimeAwareStatus(booking)}</span>
                                        )}
                                      </p>
                                    </div>
                                    
                                    <div className="flex items-center space-x-1">
                                      <button
                                        onClick={(e) => { e.preventDefault(); handleMeetingAction('view', booking) }}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        title="View"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={(e) => { e.preventDefault(); handleMeetingAction('copy', booking) }}
                                        className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                        title="Copy Link"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={(e) => { e.preventDefault(); handleMeetingAction('cancel', booking) }}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Cancel"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Show More Button */}
                      {filteredBookings.length > maxInitialMeetings && !showMoreMeetings && shownCount >= maxInitialMeetings && (
                        <div className="text-center">
                          <button
                            onClick={() => setShowMoreMeetings(true)}
                            className="btn-secondary"
                          >
                            Show more meetings ({filteredBookings.length - shownCount} remaining)
                          </button>
                        </div>
                      )}
                      
                      {/* Empty State */}
                      {filteredBookings.length === 0 && (
                        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
                          <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-slate-900 mb-2">
                            {showPendingOnly ? 'No pending meetings' : 'No meetings yet'}
                          </h3>
                          <p className="text-slate-600 mb-4">
                            {showPendingOnly ? 'All your meetings are confirmed!' : 'Create your first meeting request to get started.'}
                          </p>
                          <Link href="/create" className="btn-primary inline-flex items-center">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Meeting
                          </Link>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Meeting Defaults Tab */}
            {activeTab === 'defaults' && (
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Meeting Defaults
                  </h2>
                  
                  {!canUseDefaults ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                      <p className="text-amber-800 text-sm">
                        {getUpgradeMessage(profile?.plan as any, 'profile meeting defaults')}
                      </p>
                    </div>
                  ) : null}

                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
                        <Video className="h-4 w-4 mr-2" />
                        Default Video Meeting Link
                      </label>
                      <input
                        type="url"
                        placeholder="https://zoom.us/j/your-meeting-id or https://meet.google.com/your-link"
                        value={profileDefaults.defaultVideoLink}
                        onChange={(e) => setProfileDefaults({ ...profileDefaults, defaultVideoLink: e.target.value })}
                        disabled={!canUseDefaults}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
                        <Phone className="h-4 w-4 mr-2" />
                        Default Phone Number
                      </label>
                      <input
                        type="tel"
                        placeholder="+1 (555) 123-4567 or 'I'll call you'"
                        value={profileDefaults.defaultPhoneNumber}
                        onChange={(e) => setProfileDefaults({ ...profileDefaults, defaultPhoneNumber: e.target.value })}
                        disabled={!canUseDefaults}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
                        <MapPin className="h-4 w-4 mr-2" />
                        Default In-Person Address
                      </label>
                      <input
                        type="text"
                        placeholder="123 Main St, City, State 12345"
                        value={profileDefaults.defaultAddress}
                        onChange={(e) => setProfileDefaults({ ...profileDefaults, defaultAddress: e.target.value })}
                        disabled={!canUseDefaults}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                      />
                    </div>

                    <div>
                      <label className="flex items-center text-sm font-medium text-slate-700 mb-2">
                        <Settings className="h-4 w-4 mr-2" />
                        Default Meeting Notes/Instructions
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Default instructions or notes to include in all meetings..."
                        value={profileDefaults.defaultMeetingNotes}
                        onChange={(e) => setProfileDefaults({ ...profileDefaults, defaultMeetingNotes: e.target.value })}
                        disabled={!canUseDefaults}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        onClick={saveProfile}
                        disabled={saving}
                        className="btn-primary flex items-center"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Time Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Time Preferences
                  </h2>
                  
                  {!canUsePreferences ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                      <p className="text-amber-800 text-sm">
                        {getUpgradeMessage(profile?.plan as any, 'preference engine')}
                      </p>
                    </div>
                  ) : null}

                  <div className="space-y-6">
                    {/* Working Hours */}
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Working Hours</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Earliest Start Time
                          </label>
                          <input
                            type="time"
                            value={preferences.earliestStartTime}
                            onChange={(e) => setPreferences({ ...preferences, earliestStartTime: e.target.value })}
                            disabled={!canUsePreferences}
                            className="w-full p-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Latest End Time
                          </label>
                          <input
                            type="time"
                            value={preferences.latestEndTime}
                            onChange={(e) => setPreferences({ ...preferences, latestEndTime: e.target.value })}
                            disabled={!canUsePreferences}
                            className="w-full p-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Preferred Days */}
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Preferred Days</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <label key={day.value} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={preferences.preferredDays.split(',').includes(day.value)}
                              onChange={(e) => {
                                const currentDays = preferences.preferredDays.split(',').filter(d => d)
                                if (e.target.checked) {
                                  setPreferences({ ...preferences, preferredDays: [...currentDays, day.value].join(',') })
                                } else {
                                  setPreferences({ ...preferences, preferredDays: currentDays.filter(d => d !== day.value).join(',') })
                                }
                              }}
                              disabled={!canUsePreferences}
                              className="mr-2"
                            />
                            <span className="text-sm">{day.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Buffer Time */}
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Buffer Time</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Minutes between meetings
                          </label>
                          <select
                            value={preferences.bufferMinutes}
                            onChange={(e) => setPreferences({ ...preferences, bufferMinutes: parseInt(e.target.value) })}
                            disabled={!canUsePreferences}
                            className="w-full p-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                          >
                            <option value={0}>No buffer</option>
                            <option value={5}>5 minutes</option>
                            <option value={10}>10 minutes</option>
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                          </select>
                        </div>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={preferences.allowBackToBack}
                            onChange={(e) => setPreferences({ ...preferences, allowBackToBack: e.target.checked })}
                            disabled={!canUsePreferences}
                            className="mr-2"
                          />
                          <span className="text-sm">Allow back-to-back meetings</span>
                        </label>
                      </div>
                    </div>

                    {/* Lunch Break */}
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Lunch Break</h4>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={preferences.blockLunchBreak}
                            onChange={(e) => setPreferences({ ...preferences, blockLunchBreak: e.target.checked })}
                            disabled={!canUsePreferences}
                            className="mr-2"
                          />
                          <span className="text-sm">Block lunch break from suggestions</span>
                        </label>

                        {preferences.blockLunchBreak && (
                          <div className="grid grid-cols-2 gap-4 ml-6">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                Lunch Start
                              </label>
                              <input
                                type="time"
                                value={preferences.lunchBreakStart}
                                onChange={(e) => setPreferences({ ...preferences, lunchBreakStart: e.target.value })}
                                disabled={!canUsePreferences}
                                className="w-full p-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">
                                Lunch End
                              </label>
                              <input
                                type="time"
                                value={preferences.lunchBreakEnd}
                                onChange={(e) => setPreferences({ ...preferences, lunchBreakEnd: e.target.value })}
                                disabled={!canUsePreferences}
                                className="w-full p-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Scheduling Restrictions */}
                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Scheduling Restrictions</h4>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={preferences.allowSameDayScheduling}
                            onChange={(e) => setPreferences({ ...preferences, allowSameDayScheduling: e.target.checked })}
                            disabled={!canUsePreferences}
                            className="mr-2"
                          />
                          <span className="text-sm">Allow same-day scheduling</span>
                        </label>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Minimum notice required (hours)
                          </label>
                          <select
                            value={preferences.minimumNoticeHours}
                            onChange={(e) => setPreferences({ ...preferences, minimumNoticeHours: parseInt(e.target.value) })}
                            disabled={!canUsePreferences}
                            className="w-full p-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                          >
                            <option value={1}>1 hour</option>
                            <option value={2}>2 hours</option>
                            <option value={4}>4 hours</option>
                            <option value={8}>8 hours</option>
                            <option value={24}>24 hours (1 day)</option>
                            <option value={48}>48 hours (2 days)</option>
                            <option value={72}>72 hours (3 days)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        onClick={saveProfile}
                        disabled={saving}
                        className="btn-primary flex items-center"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sidebar */}
            <div className="space-y-6">
              
              {/* Personal Booking Link - Prominent Position */}
              {!profile?.username ? (
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-6 text-white">
                  <div className="flex items-center mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mr-3">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Setup Your Personal Booking Link</h3>
                      <p className="text-sm text-blue-100">Let others book time with you instantly</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-white/10 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-white text-sm">
                          {typeof window !== 'undefined' ? window.location.host : 'calendarsync.com'}/
                        </span>
                        <input
                          type="text"
                          placeholder="your-username"
                          value={usernameForm.username}
                          onChange={(e) => {
                            const value = e.target.value.toLowerCase().replace(/[^a-z0-9\-\._]/g, '')
                            setUsernameForm({ username: value })
                          }}
                          className={`flex-1 px-3 py-2 rounded text-slate-900 placeholder-slate-400 focus:ring-2 focus:outline-none ${
                            usernameCheck.checking ? 'bg-white border border-gray-300' :
                            usernameCheck.available === true ? 'bg-green-50 border border-green-300' :
                            usernameCheck.available === false ? 'bg-red-50 border border-red-300' :
                            'bg-white'
                          } focus:ring-blue-400`}
                        />
                        
                        {/* Validation indicator */}
                        <div className="w-6 h-6 flex items-center justify-center">
                          {usernameCheck.checking ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                          ) : usernameCheck.available === true ? (
                            <CheckCircle className="w-4 h-4 text-green-300" />
                          ) : usernameCheck.available === false ? (
                            <XCircle className="w-4 h-4 text-red-300" />
                          ) : null}
                        </div>
                      </div>
                      
                      {/* Real-time feedback */}
                      <div className="space-y-2">
                        {usernameCheck.preview && (
                          <div className="text-xs text-green-100">
                            ✅ Your link: {usernameCheck.preview}
                          </div>
                        )}
                        
                        {usernameCheck.error && (
                          <div className="text-xs text-red-200">
                            ❌ {usernameCheck.error}
                          </div>
                        )}
                        
                        {usernameCheck.suggestions.length > 0 && (
                          <div className="text-xs">
                            <span className="text-blue-200">💡 Try these instead: </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {usernameCheck.suggestions.map((suggestion, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => setUsernameForm({ username: suggestion })}
                                  className="px-2 py-1 bg-white/20 text-white rounded text-xs hover:bg-white/30 transition-colors"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={async () => {
                        if (!usernameForm.username) {
                          alert('Please enter a username')
                          return
                        }
                        setSaving(true)
                        try {
                          const response = await fetch('/api/account/profile', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              firstName: profile?.firstName || '',
                              lastName: profile?.lastName || '',
                              username: usernameForm.username
                            })
                          })
                          
                          const data = await response.json()
                          
                          if (data.success) {
                            alert('Personal booking link created successfully!')
                            checkAuthAndLoadData() // Refresh to show the new link
                          } else {
                            alert(data.error || 'Failed to create booking link')
                          }
                        } catch (error) {
                          console.error('Error creating booking link:', error)
                          alert('Failed to create booking link')
                        } finally {
                          setSaving(false)
                        }
                      }}
                      disabled={saving || !usernameForm.username || usernameCheck.available !== true}
                      className="bg-white text-blue-600 hover:bg-gray-100 px-4 py-3 rounded-lg font-medium transition-colors inline-flex items-center justify-center w-full disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <User className="h-4 w-4 mr-2" />
                      )}
                      {saving ? 'Creating...' : 'Create Personal Link'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-green-500 to-blue-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Your Personal Booking Link</h3>
                      <p className="text-sm text-green-100">Let others book time with you instantly</p>
                    </div>
                    <Zap className="h-8 w-8 text-yellow-300" />
                  </div>
                  
                  <div className="bg-white/10 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-sm bg-white/20 px-3 py-2 rounded text-white">
                        {typeof window !== 'undefined' ? window.location.host : 'calendarsync.com'}/{profile.username}
                      </code>
                      <button
                        onClick={() => {
                          const link = `${typeof window !== 'undefined' ? window.location.origin : 'https://calendarsync.com'}/${profile.username}`
                          navigator.clipboard.writeText(link)
                          alert('Link copied!')
                        }}
                        className="bg-white text-blue-600 hover:bg-gray-100 px-3 py-2 rounded text-sm font-medium transition-colors"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Feature Highlights */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Your Plan Features</h3>
                <div className="space-y-3">
                  {tierFeatures && (
                    <>
                      <div className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        <span>
                          {tierFeatures.monthlyMeetings === null 
                            ? 'Unlimited meetings' 
                            : `${tierFeatures.monthlyMeetings} meetings/month`
                          }
                        </span>
                      </div>
                      
                      {tierFeatures.preferenceEngine && (
                        <div className="flex items-center text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                          <span>AI preference engine</span>
                        </div>
                      )}
                      
                      {tierFeatures.profileDefaults && (
                        <div className="flex items-center text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                          <span>Profile meeting defaults</span>
                        </div>
                      )}
                      
                      {tierFeatures.groupRescheduling && (
                        <div className="flex items-center text-sm">
                          <Star className="h-4 w-4 text-yellow-500 mr-2" />
                          <span>Group rescheduling magic</span>
                        </div>
                      )}
                      
                      {tierFeatures.recurringSessions && (
                        <div className="flex items-center text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                          <span>Recurring sessions</span>
                        </div>
                      )}
                      
                      {tierFeatures.coachingPackages && (
                        <div className="flex items-center text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                          <span>Coaching packages</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {currentPlan !== 'coaching' && currentPlan !== 'super_admin' && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <Link href="/upgrade" className="btn-primary w-full text-center flex items-center justify-center">
                      <Zap className="h-4 w-4 mr-2" />
                      Upgrade Plan
                    </Link>
                  </div>
                )}
              </div>
              



              {/* Upgrade Prompt */}
              {currentPlan === 'free' && (
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-6 text-white">
                  <div className="flex items-center mb-3">
                    <Crown className="h-5 w-5 mr-2 flex-shrink-0" />
                    <h3 className="font-semibold">Unlock More Features</h3>
                  </div>
                  <p className="text-sm text-blue-100 mb-4 leading-relaxed">
                    Get unlimited meetings, multiple calendar accounts, and AI-powered scheduling.
                  </p>
                  <Link 
                    href="/upgrade" 
                    className="bg-white text-blue-600 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center w-full"
                  >
                    Upgrade to Professional - $${TIER_PRICING.professional}/mo
                  </Link>
                </div>
              )}
              
              {currentPlan === 'professional' && (
                <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg p-6 text-white">
                  <div className="flex items-center mb-3">
                    <Crown className="h-5 w-5 mr-2 flex-shrink-0" />
                    <h3 className="font-semibold">Coaching Features</h3>
                  </div>
                  <p className="text-sm text-purple-100 mb-4 leading-relaxed">
                    Unlock group rescheduling, coaching packages, and advanced features designed for coaches.
                  </p>
                  <Link 
                    href="/upgrade" 
                    className="bg-white text-purple-600 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center w-full"
                  >
                    Upgrade to Coaching - $${TIER_PRICING.coaching}/mo
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Edit Meeting Modal */}
      {showEditModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Edit Meeting</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedBooking(null)
                  }}
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
                    autoFocus
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
                {selectedBooking.selectedTime && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Current Meeting Time
                    </label>
                    <div className="bg-slate-50 p-3 rounded-lg mb-2">
                      <div className="text-sm font-medium">
                        {formatDateTime(new Date(selectedBooking.selectedTime))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          New Date
                        </label>
                        <input
                          type="date"
                          value={editForm.newDate || new Date(selectedBooking.selectedTime).toISOString().split('T')[0]}
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
                          value={editForm.newTime || new Date(selectedBooking.selectedTime).toTimeString().slice(0, 5)}
                          onChange={(e) => setEditForm({ ...editForm, newTime: e.target.value })}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* AI Reschedule Options */}
                {selectedBooking.selectedTime && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">🚀 AI-Powered Rescheduling</h4>
                    <p className="text-blue-700 text-sm mb-3">
                      Let our AI analyze both calendars again to find new optimal times that work for everyone.
                    </p>
                    
                    {!showAISuggestions ? (
                      <button
                        onClick={fetchAISuggestions}
                        disabled={loadingAISuggestions}
                        className="btn-primary w-full flex items-center justify-center"
                      >
                        {loadingAISuggestions ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4 mr-2" />
                        )}
                        {loadingAISuggestions ? 'Analyzing Calendars...' : 'Find New Times with AI'}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-blue-800">🎯 AI-Suggested Times:</h5>
                          <button
                            onClick={() => {
                              setShowAISuggestions(false)
                              setAISuggestions([])
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Hide suggestions
                          </button>
                        </div>
                        
                        {aiSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => selectAISuggestion(suggestion)}
                            disabled={updating}
                            className="w-full text-left p-3 bg-white border border-blue-200 rounded-lg hover:border-blue-400 transition-colors"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium text-slate-900">
                                  {formatDateTime(new Date(suggestion.start))}
                                </div>
                                <div className="text-sm text-blue-600">{suggestion.description}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-blue-600 font-medium">{suggestion.confidence}% match</div>
                                <div className="text-xs text-slate-500">Rank #{suggestion.rank}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
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
              </div>
              
              <div className="flex space-x-3 pt-6 border-t border-slate-200 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedBooking(null)
                  }}
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
      
      {/* View Meeting Modal */}
      {showViewModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Meeting Details</h2>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setSelectedBooking(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Title</label>
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <span className="font-medium">{selectedBooking.title}</span>
                  </div>
                </div>
                
                {/* Description */}
                {selectedBooking.description && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <div className="p-3 bg-slate-50 rounded-lg border">
                      <span>{selectedBooking.description}</span>
                    </div>
                  </div>
                )}
                
                {/* Meeting Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
                    <div className="p-3 bg-slate-50 rounded-lg border">
                      <span>{selectedBooking.duration} minutes</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                    <div className="p-3 bg-slate-50 rounded-lg border flex items-center">
                      {selectedBooking.meetingType === 'video' && <Video className="h-4 w-4 mr-2 text-blue-500" />}
                      {selectedBooking.meetingType === 'phone' && <Phone className="h-4 w-4 mr-2 text-green-500" />}
                      {selectedBooking.meetingType === 'in-person' && <MapPin className="h-4 w-4 mr-2 text-red-500" />}
                      <span className="capitalize">{selectedBooking.meetingType}</span>
                    </div>
                  </div>
                </div>
                
                {/* Meeting Time */}
                {selectedBooking.selectedTime ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Scheduled Time</label>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <span className="font-medium text-green-800">{formatDateTime(new Date(selectedBooking.selectedTime))}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <span className="font-medium text-amber-800">Waiting for time selection</span>
                    </div>
                  </div>
                )}
                
                {/* Meeting Location */}
                {selectedBooking.meetingType === 'video' && selectedBooking.meetingLink && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Video Link</label>
                    <div className="p-3 bg-slate-50 rounded-lg border">
                      <a href={selectedBooking.meetingLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {selectedBooking.meetingLink}
                      </a>
                    </div>
                  </div>
                )}
                
                {selectedBooking.meetingType === 'phone' && selectedBooking.phoneNumber && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                    <div className="p-3 bg-slate-50 rounded-lg border">
                      <span className="font-mono">{selectedBooking.phoneNumber}</span>
                    </div>
                  </div>
                )}
                
                {selectedBooking.meetingType === 'in-person' && selectedBooking.address && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                    <div className="p-3 bg-slate-50 rounded-lg border">
                      <span>{selectedBooking.address}</span>
                    </div>
                  </div>
                )}
                
                {/* Participants */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Participants</label>
                  <div className="space-y-2">
                    <div className="flex items-center p-2 bg-blue-50 rounded border">
                      <User className="h-4 w-4 mr-2 text-blue-600" />
                      <span>{selectedBooking.creatorName} (Organizer)</span>
                    </div>
                    {selectedBooking.recipientName && (
                      <div className="flex items-center p-2 bg-green-50 rounded border">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        <span>{selectedBooking.recipientName}</span>
                      </div>
                    )}
                    {!selectedBooking.recipientName && (
                      <div className="flex items-center p-2 bg-amber-50 rounded border">
                        <Clock className="h-4 w-4 mr-2 text-amber-600" />
                        <span>Waiting for recipient</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Meeting Notes */}
                {selectedBooking.meetingNotes && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Notes</label>
                    <div className="p-3 bg-slate-50 rounded-lg border">
                      <span>{selectedBooking.meetingNotes}</span>
                    </div>
                  </div>
                )}
                
                {/* Booking Link */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Booking Link</label>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 text-sm bg-slate-50 px-3 py-2 rounded border">
                      {window.location.origin}/book/{selectedBooking.shareToken}
                    </code>
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/book/${selectedBooking.shareToken}`
                        navigator.clipboard.writeText(link)
                        alert('Meeting link copied!')
                      }}
                      className="btn-secondary text-xs px-3 py-2"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-6 border-t border-slate-200 mt-6">
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    setSelectedBooking(null)
                  }}
                  className="btn-secondary flex-1"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false)
                    // Open edit modal for the same booking
                    const selectedTime = selectedBooking.selectedTime ? new Date(selectedBooking.selectedTime) : null
                    setEditForm({
                      title: selectedBooking.title || '',
                      description: selectedBooking.description || '',
                      duration: selectedBooking.duration || 30,
                      meetingType: selectedBooking.meetingType || 'video',
                      meetingLink: selectedBooking.meetingLink || '',
                      phoneNumber: selectedBooking.phoneNumber || '',
                      address: selectedBooking.address || '',
                      meetingNotes: selectedBooking.meetingNotes || '',
                      newDate: selectedTime ? selectedTime.toISOString().split('T')[0] : '',
                      newTime: selectedTime ? selectedTime.toTimeString().slice(0, 5) : ''
                    })
                    setShowEditModal(true)
                  }}
                  className="btn-primary flex-1 flex items-center justify-center"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}