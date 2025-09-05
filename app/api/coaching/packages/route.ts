import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hasAccess } from '@/lib/tiers'

const DEMO_USER_EMAIL = 'neal@whatarmy.com'

export async function GET() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: DEMO_USER_EMAIL },
      include: {
        coachingPackages: {
          include: {
            coachingSessions: {
              include: {
                booking: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!hasAccess(user.plan as any, 'coachingPackages')) {
      return NextResponse.json(
        { error: 'Coaching packages require Coaching plan' },
        { status: 403 }
      )
    }

    const packagesWithStats = user.coachingPackages.map(pkg => {
      const completedSessions = pkg.coachingSessions.filter(
        session => session.status === 'completed'
      ).length

      return {
        ...pkg,
        sessionsCompleted: completedSessions,
        progressPercentage: Math.round((completedSessions / pkg.totalSessions) * 100)
      }
    })

    return NextResponse.json({
      packages: packagesWithStats
    })
  } catch (error) {
    console.error('Error fetching coaching packages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch coaching packages' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description, totalSessions, sessionDuration, totalPrice } = body

    const user = await prisma.user.findUnique({
      where: { email: DEMO_USER_EMAIL }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!hasAccess(user.plan as any, 'coachingPackages')) {
      return NextResponse.json(
        { error: 'Coaching packages require Coaching plan' },
        { status: 403 }
      )
    }

    const coachingPackage = await prisma.coachingPackage.create({
      data: {
        coachId: user.id,
        name,
        description: description || null,
        totalSessions,
        sessionDuration,
        totalPrice,
        pricePerSession: totalPrice / totalSessions,
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      package: {
        ...coachingPackage,
        sessionsCompleted: 0,
        progressPercentage: 0
      }
    })
  } catch (error) {
    console.error('Error creating coaching package:', error)
    return NextResponse.json(
      { error: 'Failed to create coaching package' },
      { status: 500 }
    )
  }
}