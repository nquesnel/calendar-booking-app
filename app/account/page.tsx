'use client'

import { useState, useEffect } from 'react'
import * as React from 'react'
import Link from 'next/link'
import { 
  Calendar, 
  User, 
  Mail, 
  Shield, 
  Trash2, 
  Download, 
  LogOut, 
  Settings, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  AlertTriangle,
  Crown,
  Loader2,
  ArrowLeft,
  Clock,
  Unlink,
  ChevronDown,
  ChevronUp,
  UserPlus
} from 'lucide-react'
import { getTierFeatures, TIER_PRICING, canAddMoreCalendars, hasAccess } from '@/lib/tiers'

interface UserProfile {
  id: string
  name: string
  email: string
  plan: string
  createdAt: string
  firstName?: string
  lastName?: string
}

interface CalendarConnection {
  id: string
  provider: string
  email: string
  accountName?: string
  isPrimary: boolean
  isAccountCalendar: boolean
  connectedAt: string
  status: 'active' | 'expired' | 'error'
}

export default function AccountManagement() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [calendarConnections, setCalendarConnections] = useState<CalendarConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    username: ''
  })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [exportingData, setExportingData] = useState(false)
  const [dangerZoneExpanded, setDangerZoneExpanded] = useState(false)
  const [sessionManagementExpanded, setSessionManagementExpanded] = useState(false)
  const [dataExportExpanded, setDataExportExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
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
    setMounted(true)
    checkAuthAndLoadData()
  }, [])
  
  const checkAuthAndLoadData = async () => {
    try {
      const response = await fetch('/api/profile')
      
      if (response.status === 401) {
        // Not authenticated - redirect to login
        window.location.href = '/login?redirect=/account'
        return
      }
      
      const data = await response.json()
      
      if (!data.profile) {
        // No profile found - redirect to login
        window.location.href = '/login?redirect=/account'
        return
      }
      
      // User is authenticated, load account data
      loadAccountData()
      
      // Check for calendar connection results
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const calendarConnected = params.get('calendar_connected')
        const email = params.get('email')
        const error = params.get('error')
        
        if (error === 'email_conflict') {
          const conflictEmail = params.get('email')
          const provider = params.get('provider')
          alert(
            `⚠️ Email Conflict\n\n${conflictEmail} is already registered to a different account.\n\nTo access that calendar:\n1. Sign out of this account\n2. Log in with ${conflictEmail}\n\nOr use a different ${provider} account for additional calendar access.`
          )
        } else if (error === 'no_session') {
          alert('Session expired. Please log in again.')
        } else if (calendarConnected && email) {
          const providerName = calendarConnected === 'google' ? 'Google' : 
                              calendarConnected === 'microsoft' ? 'Microsoft Outlook' : calendarConnected
          alert(`🎉 ${providerName} calendar connected successfully for ${email}!`)
          
          // Reload data to show new connection
          setTimeout(() => loadAccountData(), 1000)
        }
        
        // Clean up URL params after handling
        if (calendarConnected || error) {
          window.history.replaceState({}, '', window.location.pathname)
        }
      }
      
    } catch (error) {
      console.error('Error checking authentication:', error)
      // On error, redirect to login
      window.location.href = '/login?redirect=/account'
    }
  }

  const loadAccountData = async () => {
    try {
      // Load profile
      const profileResponse = await fetch('/api/profile')
      const profileData = await profileResponse.json()
      
      if (profileData.profile) {
        setProfile(profileData.profile)
        
        console.log('Profile data received:', {
          firstName: profileData.profile.firstName,
          lastName: profileData.profile.lastName,
          username: profileData.profile.username
        })
        
        setEditForm({
          firstName: profileData.profile.firstName || '',
          lastName: profileData.profile.lastName || '',
          username: profileData.profile.username || ''
        })
      }

      // Load calendar connections
      const calendarResponse = await fetch('/api/account/calendar-connections')
      const calendarData = await calendarResponse.json()
      
      if (calendarData.connections) {
        setCalendarConnections(calendarData.connections)
      }
      
      // Load session information
      try {
        const sessionResponse = await fetch('/api/account/sessions')
        const sessionData = await sessionResponse.json()
        
        if (sessionData.sessions) {
          setSessions(sessionData.sessions)
        }
      } catch (error) {
        console.error('Error loading sessions:', error)
      }

    } catch (error) {
      console.error('Error loading account data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async () => {
    setSaving(true)
    try {
      // Send all form fields in one request
      const response = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          username: editForm.username
        })
      })

      const data = await response.json()

      if (data.success) {
        await loadAccountData()
        alert('Profile updated successfully!')
      } else {
        alert(data.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }
  
  // Debounced username validation
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

  const disconnectCalendar = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/account/calendar-connections/${connectionId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        await loadAccountData()
        alert('Calendar disconnected successfully')
      } else {
        alert(data.error || 'Failed to disconnect calendar')
      }
    } catch (error) {
      console.error('Error disconnecting calendar:', error)
      alert('Failed to disconnect calendar')
    }
  }

  const reconnectCalendar = async (provider: string) => {
    // Pass current user ID in the state to ensure we add calendar to correct account
    if (!profile) {
      alert('Please refresh the page and try again.')
      return
    }
    
    const state = Buffer.from(JSON.stringify({
      provider: provider,
      type: 'account_management',
      redirect: '/account',
      currentUserId: profile.id // Critical: Pass current user ID
    })).toString('base64')
    
    window.location.href = `/api/auth/${provider}?state=${encodeURIComponent(state)}&redirect=/account`
  }

  const signOutAllDevices = async () => {
    try {
      const response = await fetch('/api/account/sign-out-all', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Clear browser storage
        localStorage.clear()
        sessionStorage.clear()
        
        alert('Successfully signed out of all devices')
        
        // Redirect to homepage
        window.location.href = data.redirect || '/?logged_out=true'
      } else {
        alert(data.error || 'Failed to sign out of all devices')
      }
    } catch (error) {
      console.error('Error signing out all devices:', error)
      alert('Failed to sign out of all devices')
    }
  }

  const exportData = async () => {
    setExportingData(true)
    try {
      const response = await fetch('/api/account/export-data')
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `calendarsync-data-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        alert('Data export downloaded successfully')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to export data')
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Failed to export data')
    } finally {
      setExportingData(false)
    }
  }

  const deleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      alert('Please type DELETE to confirm account deletion')
      return
    }

    setDeleting(true)
    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        alert('Account deleted successfully')
        window.location.href = '/'
      } else {
        alert(data.error || 'Failed to delete account')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Failed to delete account')
    } finally {
      setDeleting(false)
    }
  }
  
  // Debounced username check
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (editForm.username !== profile?.username && editForm.username) {
        checkUsernameAvailability(editForm.username)
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
  }, [editForm.username, profile?.username])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'expired':
        return <Clock className="h-4 w-4 text-amber-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <XCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const tierFeatures = profile ? getTierFeatures(profile.plan as any) : null
  const currentPlan = profile?.plan || 'free'

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
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
            <span className="text-xl font-semibold">CalendarSync</span>
          </Link>
          <div className="flex items-center space-x-3">
            <Link href="/dashboard" className="btn-secondary flex items-center whitespace-nowrap">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="container-width py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Account Management</h1>
              <p className="text-slate-600 mt-1">
                Manage your account settings, security, and data
              </p>
            </div>
            
            {/* Plan Badge */}
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              currentPlan === 'super_admin' ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' :
              currentPlan === 'coaching' ? 'bg-purple-100 text-purple-800' :
              currentPlan === 'business' ? 'bg-blue-100 text-blue-800' :
              currentPlan === 'professional' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {(currentPlan === 'coaching' || currentPlan === 'super_admin') && <Crown className="h-4 w-4 mr-1" />}
              {currentPlan === 'super_admin' ? 'Super Admin Plan' : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1) + ' Plan'}
            </div>
          </div>

          {/* Main Content Tabs */}
          <div className="border-b border-slate-200 mb-8">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Account Info
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'security'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Security & Access
              </button>
              <button
                onClick={() => setActiveTab('subscription')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'subscription'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Subscription
              </button>
            </nav>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Account Info Tab */}
            {activeTab === 'profile' && (
              <>
                <div className="lg:col-span-2 space-y-6">
                  {/* Core Account Info */}
                  <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Core Account Information
                    </h2>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            First Name
                          </label>
                          <input
                            type="text"
                            value={editForm.firstName}
                            onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="First name"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={editForm.lastName}
                            onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Last name"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={profile?.email || ''}
                          disabled
                          className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Email address cannot be changed. Contact support if needed.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Personal Booking Link
                        </label>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-slate-500">calendarsync.com/</span>
                            <input
                              type="text"
                              placeholder="your-username"
                              value={editForm.username}
                              onChange={(e) => {
                                // Only allow alphanumeric, hyphens, dots, and underscores
                                const value = e.target.value.toLowerCase().replace(/[^a-z0-9\-\._]/g, '')
                                setEditForm({ ...editForm, username: value })
                              }}
                              className={`flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                usernameCheck.checking ? 'border-gray-300' :
                                usernameCheck.available === true ? 'border-green-500 bg-green-50' :
                                usernameCheck.available === false ? 'border-red-500 bg-red-50' :
                                'border-slate-300'
                              } focus:border-blue-500`}
                            />
                            
                            {/* Real-time validation indicator */}
                            <div className="w-6 h-6 flex items-center justify-center">
                              {usernameCheck.checking ? (
                                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                              ) : usernameCheck.available === true ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : usernameCheck.available === false ? (
                                <XCircle className="w-4 h-4 text-red-500" />
                              ) : null}
                            </div>
                          </div>
                          
                          {/* Live preview and feedback */}
                          <div className="space-y-2">
                            {usernameCheck.preview && (
                              <div className="text-xs">
                                <span className="text-slate-500">Your link: </span>
                                <span className="font-medium text-green-600">{usernameCheck.preview}</span>
                              </div>
                            )}
                            
                            {usernameCheck.error && (
                              <div className="text-xs text-red-600">
                                {usernameCheck.error}
                              </div>
                            )}
                            
                            {usernameCheck.suggestions.length > 0 && (
                              <div className="text-xs">
                                <span className="text-slate-500">Try these instead: </span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {usernameCheck.suggestions.map((suggestion, index) => (
                                    <button
                                      key={index}
                                      type="button"
                                      onClick={() => setEditForm({ ...editForm, username: suggestion })}
                                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                                    >
                                      {suggestion}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {!editForm.username && (
                              <div className="text-xs text-slate-500">
                                Create a personal booking link (letters, numbers, hyphens, dots only)
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Account Created
                        </label>
                        <input
                          type="text"
                          value={profile ? formatDate(profile.createdAt) : ''}
                          disabled
                          className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                        />
                      </div>

                      <div className="flex justify-end pt-4">
                        <button
                          onClick={updateProfile}
                          disabled={saving}
                          className="btn-primary flex items-center"
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <User className="h-4 w-4 mr-2" />
                          )}
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Security & Access Tab */}
            {activeTab === 'security' && (
              <>
                <div className="lg:col-span-2 space-y-6">
                  {/* Calendar Connections */}
                  <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold flex items-center">
                        <Calendar className="h-5 w-5 mr-2" />
                        Connected Calendars
                      </h2>
                      <span className="text-sm text-slate-600">
                        {calendarConnections.length} connected
                      </span>
                    </div>
                    
                    <div className="space-y-6">
                      {calendarConnections.length > 0 ? (
                        // Separate account calendars from additional calendars
                        <>
                          {/* Account Calendars */}
                          {calendarConnections.filter(c => c.isAccountCalendar).length > 0 && (
                            <div>
                              <h3 className="font-medium text-slate-900 mb-3 flex items-center">
                                <User className="h-4 w-4 mr-2 text-blue-600" />
                                Account Calendar
                              </h3>
                              <p className="text-sm text-slate-600 mb-4">
                                This is your login account and cannot be removed. To change this, create a new account.
                              </p>
                              {calendarConnections
                                .filter(c => c.isAccountCalendar)
                                .map((connection) => (
                                  <div key={connection.id} className="p-4 border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <div className="relative">
                                          {connection.provider === 'google' ? (
                                            <svg className="w-8 h-8" viewBox="0 0 24 24">
                                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                            </svg>
                                          ) : (
                                            <svg className="w-8 h-8" viewBox="0 0 24 24">
                                              <path fill="#00A4EF" d="M11.5 11.5v-11h-11v11h11z"/>
                                              <path fill="#FFB900" d="M24 11.5v-11h-11v11h11z"/>
                                              <path fill="#00D924" d="M11.5 24v-11h-11v11h11z"/>
                                              <path fill="#FF3E00" d="M24 24v-11h-11v11h11z"/>
                                            </svg>
                                          )}
                                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                                            <User className="w-2.5 h-2.5 text-white" />
                                          </div>
                                        </div>
                                        <div>
                                          <div className="flex items-center space-x-2">
                                            <span className="font-semibold text-indigo-900">
                                              {connection.accountName || connection.email}
                                            </span>
                                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded border border-indigo-200">
                                              Account Identity
                                            </span>
                                          </div>
                                          <div className="text-sm text-indigo-700">
                                            {connection.email} • Your login account
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="text-sm text-indigo-600 font-medium flex items-center">
                                        <Shield className="h-4 w-4 mr-1" />
                                        Protected
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                          
                          {/* Additional Calendars */}
                          {calendarConnections.filter(c => !c.isAccountCalendar).length > 0 && (
                            <div>
                              <h3 className="font-medium text-slate-900 mb-3 flex items-center">
                                <Calendar className="h-4 w-4 mr-2 text-green-600" />
                                Connected Calendars
                              </h3>
                              <p className="text-sm text-slate-600 mb-4">
                                Additional calendar accounts for comprehensive availability analysis.
                              </p>
                              
                              {/* Group additional calendars by provider */}
                              {Object.entries(
                                calendarConnections
                                  .filter(c => !c.isAccountCalendar)
                                  .reduce((groups, connection) => {
                                    const provider = connection.provider
                                    if (!groups[provider]) groups[provider] = []
                                    groups[provider].push(connection)
                                    return groups
                                  }, {} as Record<string, CalendarConnection[]>)
                              ).map(([provider, connections]) => {
                                const providerName = provider.charAt(0).toUpperCase() + provider.slice(1)
                                const canAddMore = profile ? canAddMoreCalendars(profile.plan as any, connections.length, providerName) : { canAdd: false, limit: 1 }
                                
                                return (
                                  <div key={provider} className="border border-slate-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center space-x-2">
                                        {provider === 'google' ? (
                                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                          </svg>
                                        ) : (
                                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path fill="#00A4EF" d="M11.5 11.5v-11h-11v11h11z"/>
                                            <path fill="#FFB900" d="M24 11.5v-11h-11v11h11z"/>
                                            <path fill="#00D924" d="M11.5 24v-11h-11v11h11z"/>
                                            <path fill="#FF3E00" d="M24 24v-11h-11v11h11z"/>
                                          </svg>
                                        )}
                                        <h4 className="font-medium text-slate-900">{providerName} Calendars</h4>
                                        <span className="text-sm text-slate-500">({connections.length}/{canAddMore.limit} additional)</span>
                                      </div>
                                      
                                      {canAddMore.canAdd && (
                                        <button
                                          onClick={() => reconnectCalendar(provider)}
                                          className="btn-secondary text-sm flex items-center"
                                        >
                                          <UserPlus className="h-4 w-4 mr-1" />
                                          Add Account
                                        </button>
                                      )}
                                    </div>
                                    
                                    <div className="space-y-3">
                                      {connections.map((connection) => (
                                        <div key={connection.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                          <div className="flex items-center space-x-3">
                                            {getStatusIcon(connection.status)}
                                            <div className="flex-1">
                                              <div className="flex items-center space-x-2">
                                                <span className="font-medium text-sm">
                                                  {connection.accountName || connection.email}
                                                </span>
                                                {connection.isPrimary && (
                                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                                    Primary
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-xs text-slate-600">
                                                {connection.email} • Connected {formatDate(connection.connectedAt)}
                                              </div>
                                            </div>
                                          </div>
                                          
                                          <div className="flex items-center space-x-2">
                                            {connection.status !== 'active' && (
                                              <button
                                                onClick={() => reconnectCalendar(connection.provider)}
                                                className="btn-secondary text-xs flex items-center"
                                              >
                                                <RefreshCw className="h-3 w-3 mr-1" />
                                                Reconnect
                                              </button>
                                            )}
                                            <button
                                              onClick={() => disconnectCalendar(connection.id)}
                                              className="btn-secondary text-xs text-red-600 hover:bg-red-50 flex items-center"
                                            >
                                              <Unlink className="h-3 w-3 mr-1" />
                                              Remove
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                      
                                      {!canAddMore.canAdd && canAddMore.message && (
                                        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                                          {canAddMore.message}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                          <p className="text-slate-600">No calendars connected</p>
                          <p className="text-slate-500 text-sm mb-6">
                            Connect your calendars to enable smart scheduling
                          </p>
                          <div className="flex space-x-3 justify-center">
                            <button
                              onClick={() => reconnectCalendar('google')}
                              className="btn-secondary text-sm flex items-center"
                            >
                              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                              </svg>
                              Connect Google
                            </button>
                            <button
                              onClick={() => reconnectCalendar('microsoft')}
                              className="btn-secondary text-sm flex items-center"
                            >
                              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                                <path fill="#00A4EF" d="M11.5 11.5v-11h-11v11h11z"/>
                                <path fill="#FFB900" d="M24 11.5v-11h-11v11h11z"/>
                                <path fill="#00D924" d="M11.5 24v-11h-11v11h11z"/>
                                <path fill="#FF3E00" d="M24 24v-11h-11v11h11z"/>
                              </svg>
                              Connect Outlook
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Add New Provider */}
                      {calendarConnections.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-slate-200">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="font-medium text-slate-900">Connect New Calendar</h3>
                              <p className="text-sm text-slate-600">
                                Add more calendar accounts for complete availability analysis
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex space-x-3">
                            <button
                              onClick={() => reconnectCalendar('google')}
                              className="btn-secondary text-sm flex items-center"
                            >
                              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                              </svg>
                              Connect Google Calendar
                            </button>
                            {!calendarConnections.some(c => c.provider === 'microsoft') && (
                              <button
                                onClick={() => reconnectCalendar('microsoft')}
                                className="btn-secondary text-sm flex items-center"
                              >
                                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                                  <path fill="#00A4EF" d="M11.5 11.5v-11h-11v11h11z"/>
                                  <path fill="#FFB900" d="M24 11.5v-11h-11v11h11z"/>
                                  <path fill="#00D924" d="M11.5 24v-11h-11v11h11z"/>
                                  <path fill="#FF3E00" d="M24 24v-11h-11v11h11z"/>
                                </svg>
                                Connect Microsoft Outlook
                              </button>
                            )}
                          </div>
                          
                          {/* Show upgrade message for multiple calendars */}
                          {profile && !hasAccess(profile.plan as any, 'multipleCalendars') && (
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <div className="flex items-center">
                                <Crown className="h-4 w-4 text-amber-600 mr-2" />
                                <span className="text-amber-800 text-sm font-medium">
                                  Upgrade to Professional ($15/month) to connect multiple calendar accounts and get AI analysis across all your calendars.
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Session Management - Collapsible */}
                  <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <button
                      type="button"
                      onClick={() => setSessionManagementExpanded(!sessionManagementExpanded)}
                      className="w-full flex items-center justify-between p-0 bg-transparent border-0 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                    >
                      <h2 className="text-lg font-semibold flex items-center">
                        <Shield className="h-5 w-5 mr-2" />
                        Session Management
                      </h2>
                      <div className="flex items-center">
                        {sessionManagementExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-500" />
                        )}
                      </div>
                    </button>
                    
                    {sessionManagementExpanded && (
                      <div className="mt-6 space-y-6 animate-in slide-in-from-top-1 duration-200">
                        {/* Current Sessions */}
                        <div>
                          <h3 className="font-medium text-slate-900 mb-3">Active Sessions</h3>
                          <div className="space-y-3">
                            {sessions.length > 0 ? (
                              sessions.map((session, index) => (
                                <div key={session.id || index} className="p-4 bg-slate-50 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <span className={`w-2 h-2 rounded-full ${
                                          session.isCurrent ? 'bg-green-500' : 'bg-slate-400'
                                        }`}></span>
                                        <span className="font-medium text-sm">
                                          {session.isCurrent ? 'Current Session' : 'Other Device'}
                                        </span>
                                      </div>
                                      <div className="text-xs text-slate-600 space-y-1">
                                        <div><strong>Device:</strong> {session.device} • {session.browser}</div>
                                        <div><strong>Method:</strong> {session.loginMethod === 'google' ? 'Google OAuth' : session.loginMethod}</div>
                                        <div><strong>Location:</strong> {session.location}</div>
                                        <div><strong>IP Address:</strong> {session.ipAddress}</div>
                                        <div><strong>Login Time:</strong> {session.loginTime ? new Date(session.loginTime).toLocaleString() : 'Unknown'}</div>
                                        <div><strong>Last Activity:</strong> {session.lastActivity ? new Date(session.lastActivity).toLocaleString() : 'Now'}</div>
                                        <div><strong>Status:</strong> 
                                          <span className={`ml-1 ${session.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                            {session.isActive ? 'Active' : 'Expired'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    {!session.isCurrent && (
                                      <button
                                        className="text-red-600 hover:text-red-700 text-xs px-3 py-1 border border-red-300 rounded hover:bg-red-50"
                                        onClick={() => alert('Individual session termination coming soon!')}
                                      >
                                        End Session
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 bg-slate-50 rounded-lg text-center">
                                <p className="text-slate-600 text-sm">No session data available</p>
                                <p className="text-slate-500 text-xs mt-1">
                                  Session tracking will appear here for future logins
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Sign Out All Devices */}
                        <div className="pt-4 border-t border-slate-200">
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                              <span className="font-medium text-amber-800">Sign Out All Devices</span>
                            </div>
                            <p className="text-amber-700 text-sm mb-4">
                              This will sign you out of all devices and sessions. You'll need to sign in again.
                            </p>
                            <button
                              onClick={signOutAllDevices}
                              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm flex items-center"
                            >
                              <LogOut className="h-4 w-4 mr-2" />
                              Sign Out All Devices
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Data Export - Collapsible */}
                  <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <button
                      type="button"
                      onClick={() => setDataExportExpanded(!dataExportExpanded)}
                      className="w-full flex items-center justify-between p-0 bg-transparent border-0 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                    >
                      <h2 className="text-lg font-semibold flex items-center">
                        <Download className="h-5 w-5 mr-2" />
                        Data Export
                      </h2>
                      <div className="flex items-center">
                        {dataExportExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-500" />
                        )}
                      </div>
                    </button>
                    
                    {dataExportExpanded && (
                      <div className="mt-6 animate-in slide-in-from-top-1 duration-200">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <h3 className="font-medium text-blue-800 mb-2">Export Your Data</h3>
                          <p className="text-blue-700 text-sm mb-4">
                            Download all your meeting data, preferences, and account information in JSON format.
                          </p>
                          <button
                            onClick={exportData}
                            disabled={exportingData}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center"
                          >
                            {exportingData ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 mr-2" />
                            )}
                            {exportingData ? 'Exporting...' : 'Export Data'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Account Deletion - Collapsible Danger Zone */}
                  <div className="bg-white rounded-lg border border-red-200 p-6">
                    <button
                      type="button"
                      onClick={() => setDangerZoneExpanded(!dangerZoneExpanded)}
                      className="w-full flex items-center justify-between p-0 bg-transparent border-0 text-left focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
                    >
                      <h2 className="text-lg font-semibold flex items-center text-red-600">
                        <Trash2 className="h-5 w-5 mr-2" />
                        Danger Zone
                      </h2>
                      <div className="flex items-center">
                        {dangerZoneExpanded ? (
                          <ChevronUp className="h-5 w-5 text-red-500" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </button>
                    
                    {dangerZoneExpanded && (
                      <div className="mt-6 animate-in slide-in-from-top-1 duration-200">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <h3 className="font-medium text-red-800 mb-2">Delete Account</h3>
                          <p className="text-red-700 text-sm mb-4">
                            Permanently delete your account and all associated data. This cannot be undone.
                          </p>
                          <button
                            onClick={() => setShowDeleteModal(true)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm flex items-center"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Account
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Subscription Tab */}
            {activeTab === 'subscription' && (
              <>
                <div className="lg:col-span-2 space-y-6">
                  {/* Current Plan */}
                  <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center">
                      <Crown className="h-5 w-5 mr-2" />
                      Current Subscription
                    </h2>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold">{currentPlan.charAt(0).toUpperCase()}{currentPlan.slice(1)} Plan</h3>
                            <p className="text-slate-600">
                              {currentPlan === 'free' ? 'Free forever' : `$${TIER_PRICING[currentPlan as keyof typeof TIER_PRICING] || 0}/month`}
                            </p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                            currentPlan === 'coaching' ? 'bg-purple-100 text-purple-800' :
                            currentPlan === 'business' ? 'bg-blue-100 text-blue-800' :
                            currentPlan === 'professional' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            Active
                          </div>
                        </div>
                        
                        {tierFeatures && (
                          <div className="space-y-2">
                            <h4 className="font-medium text-slate-900">Plan Features:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center">
                                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                <span>
                                  {tierFeatures.monthlyMeetings === null 
                                    ? 'Unlimited meetings' 
                                    : `${tierFeatures.monthlyMeetings} meetings/month`
                                  }
                                </span>
                              </div>
                              
                              {tierFeatures.multipleCalendars && (
                                <div className="flex items-center">
                                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                  <span>Multiple calendar accounts ({tierFeatures.maxCalendarAccounts} per provider)</span>
                                </div>
                              )}
                              
                              {tierFeatures.preferenceEngine && (
                                <div className="flex items-center">
                                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                  <span>AI preference engine</span>
                                </div>
                              )}
                              
                              {tierFeatures.profileDefaults && (
                                <div className="flex items-center">
                                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                  <span>Profile meeting defaults</span>
                                </div>
                              )}
                              
                              {tierFeatures.groupRescheduling && (
                                <div className="flex items-center">
                                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                  <span>Group rescheduling</span>
                                </div>
                              )}
                              
                              {tierFeatures.recurringSessions && (
                                <div className="flex items-center">
                                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                  <span>Recurring sessions</span>
                                </div>
                              )}
                              
                              {tierFeatures.coachingPackages && (
                                <div className="flex items-center">
                                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                  <span>Coaching packages</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {currentPlan !== 'coaching' && currentPlan !== 'super_admin' && (
                        <div className="text-center pt-4">
                          <Link 
                            href="/upgrade" 
                            className="btn-primary inline-flex items-center"
                          >
                            <Crown className="h-4 w-4 mr-2" />
                            Upgrade Plan
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Your Plan Features */}
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
                      
                      {tierFeatures.multipleCalendars && (
                        <div className="flex items-center text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                          <span>Multiple calendar accounts</span>
                        </div>
                      )}
                      
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
                          <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
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
                      
                      {currentPlan === 'super_admin' && (
                        <div className="flex items-center text-sm">
                          <Crown className="h-4 w-4 text-yellow-500 mr-2" />
                          <span>Super Admin Access</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {currentPlan !== 'coaching' && currentPlan !== 'super_admin' && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <Link href="/upgrade" className="btn-primary w-full text-center flex items-center justify-center">
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade Plan
                    </Link>
                  </div>
                )}
              </div>

              {/* Help Section */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Need Help?</h3>
                <div className="space-y-3 text-sm">
                  <p className="text-slate-600">
                    Have questions about your account or subscription?
                  </p>
                  <Link 
                    href="mailto:support@calendarsync.com"
                    className="text-blue-600 hover:text-blue-700 flex items-center"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Support
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-red-600">Delete Account</h2>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                    <p className="text-red-800 font-medium">This action cannot be undone</p>
                  </div>
                </div>
                
                <p className="text-slate-700 mb-4">
                  Deleting your account will permanently remove:
                </p>
                
                <ul className="text-slate-600 text-sm space-y-1 mb-6">
                  <li>• All meeting data and history</li>
                  <li>• Calendar connections and preferences</li>
                  <li>• Profile information and settings</li>
                  <li>• Subscription and billing data</li>
                </ul>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Type "DELETE" to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="DELETE"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={deleting || deleteConfirmation !== 'DELETE'}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex-1 flex items-center justify-center disabled:opacity-50"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  {deleting ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}