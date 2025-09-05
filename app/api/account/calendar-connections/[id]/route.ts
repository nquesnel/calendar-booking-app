import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const calendarToken = await prisma.calendarToken.findUnique({
      where: { id }
    })
    
    if (!calendarToken) {
      return NextResponse.json(
        { error: 'Calendar connection not found' },
        { status: 404 }
      )
    }
    
    await prisma.calendarToken.delete({
      where: { id }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Calendar connection removed'
    })
    
  } catch (error) {
    console.error('Error disconnecting calendar:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect calendar' },
      { status: 500 }
    )
  }
}