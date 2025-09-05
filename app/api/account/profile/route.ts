import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

export async function PUT(req: NextRequest) {
  try {
    const { firstName, lastName, username } = await req.json()
    
    // Get user from session token
    const sessionUser = await getUserFromRequest(req)
    
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Validate username if provided
    if (username) {
      // Check if username is already taken
      const existingUser = await prisma.user.findUnique({
        where: { username: username }
      })
      
      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 400 }
        )
      }
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName,
        username: username || null,
        name: `${firstName} ${lastName}`.trim() || user.name // Update display name
      }
    })
    
    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email
      }
    })
    
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}