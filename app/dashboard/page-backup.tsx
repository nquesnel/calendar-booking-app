'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, Clock, CheckCircle, XCircle, Users, TrendingUp, BarChart3, ArrowLeft } from 'lucide-react'

interface DashboardStats {
  totalBookings: number
  confirmedBookings: number
  pendingBookings: number
  thisMonthBookings: number
  avgDuration: number
  popularTimes: string[]
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
    thisMonthBookings: 0,
    avgDuration: 30,
    popularTimes: []
  })
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // This would fetch from API
      // const response = await fetch('/api/dashboard')
      // const data = await response.json()
      
      // Mock data for demonstration
      setStats({
        totalBookings: 47,
        confirmedBookings: 42,
        pendingBookings: 5,
        thisMonthBookings: 12,
        avgDuration: 35,
        popularTimes: ['10:00 AM', '2:00 PM', '3:30 PM']
      })
      
      setRecentBookings([
        {
          id: '1',
          title: 'Product Review',
          recipient: 'Jane Smith',
          status: 'confirmed',
          time: '2024-01-15 10:00 AM',
          duration: 30
        },
        {
          id: '2',
          title: 'Team Sync',
          recipient: 'Bob Johnson',
          status: 'confirmed',
          time: '2024-01-16 2:00 PM',
          duration: 60
        },
        {
          id: '3',
          title: 'Client Call',
          recipient: 'Sarah Davis',
          status: 'pending',
          time: 'Pending',
          duration: 45
        }
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      icon: <Calendar className="h-5 w-5 text-primary" />,
      change: '+12%',
      positive: true
    },
    {
      title: 'Confirmed',
      value: stats.confirmedBookings,
      icon: <CheckCircle className="h-5 w-5 text-success" />,
      change: '+8%',
      positive: true
    },
    {
      title: 'Pending',
      value: stats.pendingBookings,
      icon: <Clock className="h-5 w-5 text-secondary" />,
      change: '-3',
      positive: false
    },
    {
      title: 'This Month',
      value: stats.thisMonthBookings,
      icon: <TrendingUp className="h-5 w-5 text-primary" />,
      change: '+24%',
      positive: true
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 bg-white z-50">
        <div className="container-width py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <Calendar className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold">CalendarSync</span>
            </Link>
            <span className="text-secondary">|</span>
            <span className="font-medium">Dashboard</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/create" className="btn-primary">
              New Booking
            </Link>
          </div>
        </div>
      </nav>

      <div className="container-width py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-secondary">Track your meeting scheduling performance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, idx) => (
            <div key={idx} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-muted rounded-lg">
                  {stat.icon}
                </div>
                <span className={`text-sm font-medium ${
                  stat.positive ? 'text-success' : 'text-secondary'
                }`}>
                  {stat.change}
                </span>
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-secondary">{stat.title}</div>
            </div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Bookings */}
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Recent Bookings</h2>
              <div className="space-y-3">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{booking.title}</div>
                      <div className="text-sm text-secondary">
                        with {booking.recipient} • {booking.duration} min
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{booking.time}</div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed' 
                          ? 'bg-success/10 text-success' 
                          : 'bg-secondary/10 text-secondary'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/bookings" className="block mt-4 text-center text-primary hover:text-blue-600">
                View All Bookings →
              </Link>
            </div>
          </div>

          {/* Insights */}
          <div className="space-y-6">
            {/* Average Duration */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Clock className="h-5 w-5 text-primary mr-2" />
                Meeting Insights
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary">Avg Duration</span>
                  <span className="font-medium">{stats.avgDuration} min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary">Success Rate</span>
                  <span className="font-medium">89%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-secondary">Avg Response Time</span>
                  <span className="font-medium">2.5 hours</span>
                </div>
              </div>
            </div>

            {/* Popular Times */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 text-primary mr-2" />
                Popular Times
              </h3>
              <div className="space-y-2">
                {stats.popularTimes.map((time, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-secondary">#{idx + 1}</span>
                    <span className="font-medium">{time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link href="/create" className="block w-full btn-primary text-center">
                  Create New Booking
                </Link>
                <Link href="/settings" className="block w-full btn-secondary text-center">
                  Account Settings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}