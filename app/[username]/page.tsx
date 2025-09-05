'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Clock, User, Video, Phone, MapPin, ArrowLeft } from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  email: string
  username: string
  plan: string
  firstName?: string
  lastName?: string
}

interface MeetingType {
  id: string
  name: string
  duration: number
  description: string
  meetingType: 'video' | 'phone' | 'in-person'
  meetingLink?: string
  phoneNumber?: string
  address?: string
  price?: number
}

export default function PersonalBookingPage() {
  const { username } = useParams()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string | null>(null)

  useEffect(() => {
    if (username) {
      loadUserProfile()
    }
  }, [username])

  const loadUserProfile = async () => {
    try {
      const response = await fetch(`/api/public/user/${username}`)
      const data = await response.json()
      
      if (data.user) {
        setUser(data.user)
        setMeetingTypes(data.meetingTypes || getDefaultMeetingTypes())
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDefaultMeetingTypes = (): MeetingType[] => [
    {
      id: '15min',
      name: '15-Minute Chat',
      duration: 15,
      description: 'Quick conversation or coffee chat',
      meetingType: 'video'
    },
    {
      id: '30min',
      name: '30-Minute Meeting',
      duration: 30,
      description: 'Standard meeting or consultation',
      meetingType: 'video'
    },
    {
      id: '60min',
      name: '1-Hour Session',
      duration: 60,
      description: 'In-depth discussion or strategy session',
      meetingType: 'video'
    }
  ]

  const bookMeeting = async (meetingTypeId: string) => {
    if (!user) return
    
    try {
      const meetingType = meetingTypes.find(mt => mt.id === meetingTypeId)
      if (!meetingType) return

      // Create a new booking request with the selected meeting type
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorName: user.name,
          creatorEmail: user.email,
          meetingTitle: meetingType.name,
          meetingDescription: meetingType.description,
          duration: meetingType.duration.toString(),
          meetingType: meetingType.meetingType,
          meetingLink: meetingType.meetingLink,
          phoneNumber: meetingType.phoneNumber,
          address: meetingType.address,
          // This is a personal booking link request
          isPersonalBooking: true
        })
      })
      
      const data = await response.json()
      
      if (data.shareLink) {
        // Redirect to the booking page for calendar connection
        window.location.href = data.shareLink
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Failed to create meeting request')
    }
  }

  const getMeetingIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-5 w-5" />
      case 'phone': return <Phone className="h-5 w-5" />
      case 'in-person': return <MapPin className="h-5 w-5" />
      default: return <Calendar className="h-5 w-5" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">User Not Found</h2>
          <p className="text-slate-600 mb-6">The booking link "{username}" doesn't exist or is no longer available.</p>
          <Link href="/" className="btn-primary">
            Go to CalendarSync
          </Link>
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
            <span className="text-xl font-semibold">CalendarSync</span>
          </Link>
          <Link href="/" className="btn-secondary flex items-center">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Link>
        </div>
      </nav>

      <div className="container-width py-12">
        <div className="max-w-2xl mx-auto">
          {/* User Profile Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Book with {user.firstName || user.name}</h1>
            <p className="text-slate-600">
              Choose a meeting type and I'll find a time that works for both of us
            </p>
            <div className="mt-4 inline-flex items-center px-3 py-1 bg-slate-100 rounded-full text-sm text-slate-600">
              <Calendar className="h-4 w-4 mr-1" />
              {window.location.host}/{username}
            </div>
          </div>

          {/* Meeting Types */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Select Meeting Type</h2>
            
            {meetingTypes.map((meetingType) => (
              <button
                key={meetingType.id}
                onClick={() => bookMeeting(meetingType.id)}
                className="w-full p-6 border-2 border-slate-200 rounded-lg hover:border-blue-400 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      {getMeetingIcon(meetingType.meetingType)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{meetingType.name}</h3>
                      <p className="text-slate-600 text-sm mt-1">{meetingType.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-slate-500 mt-2">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {meetingType.duration} minutes
                        </div>
                        <div className="flex items-center">
                          {getMeetingIcon(meetingType.meetingType)}
                          <span className="ml-1 capitalize">{meetingType.meetingType}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-blue-600 group-hover:text-blue-700">
                    <Calendar className="h-6 w-6" />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Powered by CalendarSync */}
          <div className="text-center mt-12 pt-8 border-t border-slate-200">
            <p className="text-slate-500 text-sm mb-4">
              Powered by CalendarSync - Effortless scheduling
            </p>
            <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Create your own booking link →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}