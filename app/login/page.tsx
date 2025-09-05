'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Calendar } from 'lucide-react'

export default function LoginPage() {
  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/profile')
        if (response.ok) {
          const data = await response.json()
          if (data.profile) {
            // User is already authenticated, redirect to dashboard
            window.location.href = '/dashboard'
          }
        }
      } catch (error) {
        // User is not authenticated, stay on login page
      }
    }
    
    checkAuth()
  }, [])

  const loginWithGoogle = () => {
    // Get redirect URL from query params (if user was redirected here from a protected page)
    const urlParams = new URLSearchParams(window.location.search)
    const redirectAfterLogin = urlParams.get('redirect') || '/dashboard'
    
    // Redirect to Google OAuth for login
    window.location.href = `/api/auth/google?redirect=${encodeURIComponent(redirectAfterLogin)}`
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <Link href="/" className="flex items-center justify-center space-x-2 mb-8">
            <Calendar className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">CalendarSync</span>
          </Link>
          
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back
          </h2>
          <p className="text-slate-600">
            Sign in to your account to manage meetings and schedules
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center px-4 py-3 border border-slate-300 rounded-lg shadow-sm bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
          
          <p className="text-xs text-slate-500 text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm text-slate-600">
            Don't have an account?{' '}
            <button onClick={loginWithGoogle} className="text-blue-600 hover:text-blue-500">
              Sign up with Google
            </button>
          </p>
        </div>

        <div className="text-center">
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  )
}