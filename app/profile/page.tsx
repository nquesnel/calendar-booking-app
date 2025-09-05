'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, ArrowRight, Settings } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard after a brief delay
    const timer = setTimeout(() => {
      router.push('/dashboard')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-lg border border-slate-200 p-8">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Calendar className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-semibold">CalendarSync</span>
          </div>
          
          <div className="mb-6">
            <Settings className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Settings Moved!</h1>
            <p className="text-slate-600 leading-relaxed">
              All settings and preferences have been moved to your dashboard for a better experience. 
              You'll be redirected automatically in a few seconds.
            </p>
          </div>

          <div className="space-y-3">
            <Link 
              href="/dashboard" 
              className="btn-primary w-full flex items-center justify-center"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Link>
            
            <p className="text-sm text-slate-500">
              Redirecting automatically in 3 seconds...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}