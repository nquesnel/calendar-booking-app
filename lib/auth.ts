import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'
import { prisma } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this'
const TOKEN_EXPIRY = '7d' // 7 days

export interface SessionUser {
  id: string
  email: string
  name: string
  plan: string
}

export function generateToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

export function verifyToken(token: string): SessionUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SessionUser
    return decoded
  } catch (error) {
    return null
  }
}

export async function getUserFromRequest(req: NextRequest): Promise<SessionUser | null> {
  try {
    // Try to get token from Authorization header
    const authHeader = req.headers.get('Authorization')
    let token = authHeader?.replace('Bearer ', '')
    
    // If no auth header, try cookie
    if (!token) {
      token = req.cookies.get('auth-token')?.value
    }
    
    if (!token) {
      return null
    }
    
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return null
    }
    
    // Verify user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    })
    
    if (!user) {
      return null
    }
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan
    }
    
  } catch (error) {
    console.error('Error getting user from request:', error)
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function createAuthResponse(user: SessionUser, redirectUrl?: string) {
  const token = generateToken(user)
  
  if (redirectUrl) {
    const response = new Response(null, {
      status: 302,
      headers: { 'Location': redirectUrl }
    })
    
    response.headers.append('Set-Cookie', `auth-token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`)
    return response
  }
  
  return {
    success: true,
    user,
    token
  }
}