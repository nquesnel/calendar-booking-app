import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getUserFromRequest(req)
    
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const { username } = await req.json()
    
    if (!username || username.length < 3) {
      return NextResponse.json({
        available: false,
        error: 'Username must be at least 3 characters',
        suggestions: []
      })
    }
    
    // Clean username (only allow valid characters)
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9\-\.\_]/g, '')
    
    if (cleanUsername !== username.toLowerCase()) {
      return NextResponse.json({
        available: false,
        error: 'Username can only contain letters, numbers, hyphens, dots, and underscores',
        cleanedUsername: cleanUsername,
        suggestions: [cleanUsername]
      })
    }
    
    // Check if username is taken
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername }
    })
    
    if (existingUser && existingUser.id !== sessionUser.id) {
      // Username taken - generate smart suggestions
      const suggestions = await generateUsernameSuggestions(cleanUsername, sessionUser.name, sessionUser.email)
      
      return NextResponse.json({
        available: false,
        error: 'Username is already taken',
        suggestions: suggestions
      })
    }
    
    // Username is available
    return NextResponse.json({
      available: true,
      username: cleanUsername,
      preview: `${process.env.NEXT_PUBLIC_APP_URL?.replace('http://localhost:2769', 'calendarsync.com') || 'calendarsync.com'}/${cleanUsername}`
    })
    
  } catch (error) {
    console.error('Error checking username availability:', error)
    return NextResponse.json(
      { error: 'Failed to check username availability' },
      { status: 500 }
    )
  }
}

async function generateUsernameSuggestions(username: string, fullName: string, email: string): Promise<string[]> {
  const suggestions: string[] = []
  
  // Extract name parts
  const nameParts = fullName.toLowerCase().split(' ').filter(part => part.length > 0)
  const firstName = nameParts[0] || ''
  const lastName = nameParts[1] || ''
  const emailPrefix = email.split('@')[0].toLowerCase()
  
  // Generate suggestions
  const baseSuggestions = [
    `${username}-coach`,
    `${username}-consulting`, 
    `${username}${new Date().getFullYear()}`,
    `${firstName}-${lastName}`,
    `${firstName}.${lastName}`,
    `${firstName}${lastName}`,
    emailPrefix,
    `${emailPrefix}-pro`,
    `${username}2`,
    `${username}-${Math.random().toString(36).substr(2, 3)}`
  ].filter(s => s.length >= 3 && s !== username)
  
  // Check which suggestions are actually available
  for (const suggestion of baseSuggestions) {
    if (suggestions.length >= 3) break // Limit to 3 suggestions
    
    const cleanSuggestion = suggestion.replace(/[^a-z0-9\-\.\_]/g, '')
    if (cleanSuggestion.length < 3) continue
    
    const exists = await prisma.user.findUnique({
      where: { username: cleanSuggestion }
    })
    
    if (!exists) {
      suggestions.push(cleanSuggestion)
    }
  }
  
  return suggestions.slice(0, 3) // Return top 3 available suggestions
}