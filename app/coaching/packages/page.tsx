'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Calendar, 
  ArrowLeft, 
  Plus, 
  Users, 
  Clock, 
  DollarSign,
  Edit,
  Trash2,
  Star,
  CheckCircle
} from 'lucide-react'

interface CoachingPackage {
  id: string
  name: string
  description: string
  totalSessions: number
  sessionDuration: number
  pricePerSession?: number
  totalPrice?: number
  isActive: boolean
  sessionsCompleted?: number
  createdAt: string
}

export default function CoachingPackages() {
  const [packages, setPackages] = useState<CoachingPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    totalSessions: 4,
    sessionDuration: 60,
    totalPrice: 400
  })

  useEffect(() => {
    loadPackages()
  }, [])

  const loadPackages = async () => {
    try {
      const response = await fetch('/api/coaching/packages')
      const data = await response.json()
      
      if (response.ok) {
        setPackages(data.packages || [])
      } else if (response.status === 403) {
        // User doesn't have access to coaching packages
        alert('Coaching packages require a Coaching plan upgrade')
        setPackages([])
      } else {
        console.error('Error loading packages:', data.error)
        setPackages([])
      }
    } catch (error) {
      console.error('Error loading packages:', error)
      setPackages([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/coaching/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setPackages([...packages, data.package])
        setShowCreateForm(false)
        setFormData({
          name: '',
          description: '',
          totalSessions: 4,
          sessionDuration: 60,
          totalPrice: 400
        })
      } else {
        alert(data.error || 'Failed to create package')
      }
    } catch (error) {
      console.error('Error creating package:', error)
      alert('Failed to create package')
    }
  }

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
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="btn-secondary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <div className="container-width py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Coaching Packages</h1>
              <p className="text-slate-600 mt-1">
                Manage your coaching programs and track client progress
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Package
            </button>
          </div>

          {/* Create Package Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Create New Coaching Package</h3>
                
                <form onSubmit={handleCreatePackage} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Package Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Executive Leadership Program"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe the coaching program..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Total Sessions
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="52"
                        required
                        value={formData.totalSessions}
                        onChange={(e) => setFormData({ ...formData, totalSessions: parseInt(e.target.value) })}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Session Duration (min)
                      </label>
                      <select
                        value={formData.sessionDuration}
                        onChange={(e) => setFormData({ ...formData, sessionDuration: parseInt(e.target.value) })}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>60 minutes</option>
                        <option value={90}>90 minutes</option>
                        <option value={120}>120 minutes</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Total Package Price ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={formData.totalPrice}
                      onChange={(e) => setFormData({ ...formData, totalPrice: parseFloat(e.target.value) })}
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      ${(formData.totalPrice / formData.totalSessions).toFixed(2)} per session
                    </p>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary flex-1"
                    >
                      Create Package
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Packages Grid */}
          {packages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <div key={pkg.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-slate-900">{pkg.name}</h3>
                      <div className="flex items-center space-x-1">
                        <button className="p-1 hover:bg-slate-100 rounded">
                          <Edit className="h-4 w-4 text-slate-500" />
                        </button>
                        <button className="p-1 hover:bg-slate-100 rounded">
                          <Trash2 className="h-4 w-4 text-slate-500" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                      {pkg.description}
                    </p>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center text-slate-600">
                          <Users className="h-4 w-4 mr-1" />
                          Sessions
                        </span>
                        <span className="font-medium">
                          {pkg.sessionsCompleted || 0} / {pkg.totalSessions}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center text-slate-600">
                          <Clock className="h-4 w-4 mr-1" />
                          Duration
                        </span>
                        <span className="font-medium">{pkg.sessionDuration} min</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center text-slate-600">
                          <DollarSign className="h-4 w-4 mr-1" />
                          Price
                        </span>
                        <span className="font-medium">${pkg.totalPrice}</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                          <span>Progress</span>
                          <span>{Math.round(((pkg.sessionsCompleted || 0) / pkg.totalSessions) * 100)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ 
                              width: `${((pkg.sessionsCompleted || 0) / pkg.totalSessions) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        pkg.isActive 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {pkg.isActive ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          'Inactive'
                        )}
                      </span>
                      
                      {(pkg.sessionsCompleted || 0) === pkg.totalSessions && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          <Star className="h-3 w-3 mr-1" />
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No coaching packages yet</h3>
              <p className="text-slate-600 mb-4">
                Create your first coaching package to start organizing your client programs.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Package
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}