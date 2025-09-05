import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hasAccess } from '@/lib/tiers'

const DEMO_USER_EMAIL = 'neal@whatarmy.com'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, description, totalSessions, sessionDuration, totalPrice, isActive } = body

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

    const updatedPackage = await prisma.coachingPackage.update({
      where: {
        id,
        coachId: user.id
      },
      data: {
        name,
        description: description || null,
        totalSessions,
        sessionDuration,
        totalPrice,
        pricePerSession: totalPrice / totalSessions,
        isActive
      }
    })

    return NextResponse.json({
      success: true,
      package: updatedPackage
    })
  } catch (error) {
    console.error('Error updating coaching package:', error)
    return NextResponse.json(
      { error: 'Failed to update coaching package' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    await prisma.coachingPackage.delete({
      where: {
        id,
        coachId: user.id
      }
    })

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Error deleting coaching package:', error)
    return NextResponse.json(
      { error: 'Failed to delete coaching package' },
      { status: 500 }
    )
  }
}