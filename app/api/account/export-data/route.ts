import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    // In a real app, you'd get the user email from session/JWT
    const DEMO_USER_EMAIL = 'neal@whatarmy.com'
    
    // Get user profile
    const user = await prisma.user.findUnique({
      where: { email: DEMO_USER_EMAIL }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Get all user bookings
    const bookings = await prisma.booking.findMany({
      where: { creatorEmail: DEMO_USER_EMAIL },
      include: {
        suggestions: true
      }
    })
    
    // Get calendar connections
    const calendarConnections = await prisma.calendarToken.findMany({
      where: { email: DEMO_USER_EMAIL }
    })
    
    // Get user preferences
    const preferences = await prisma.userPreferences.findFirst({
      where: { userEmail: DEMO_USER_EMAIL }
    })
    
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        plan: user.plan,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      bookings: bookings.map(booking => ({
        id: booking.id,
        title: booking.title,
        description: booking.description,
        duration: booking.duration,
        status: booking.status,
        creatorName: booking.creatorName,
        creatorEmail: booking.creatorEmail,
        recipientName: booking.recipientName,
        recipientEmail: booking.recipientEmail,
        selectedTime: booking.selectedTime,
        meetingType: booking.meetingType,
        meetingLink: booking.meetingLink,
        phoneNumber: booking.phoneNumber,
        address: booking.address,
        meetingNotes: booking.meetingNotes,
        isGroupMeeting: booking.isGroupMeeting,
        maxParticipants: booking.maxParticipants,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        suggestions: booking.suggestions
      })),
      calendarConnections: calendarConnections.map(conn => ({
        id: conn.id,
        provider: conn.provider,
        email: conn.email,
        connectedAt: conn.createdAt
      })),
      preferences: preferences ? {
        earliestStartTime: preferences.earliestStartTime,
        latestEndTime: preferences.latestEndTime,
        preferredDays: preferences.preferredDays,
        avoidDays: preferences.avoidDays,
        bufferMinutes: preferences.bufferMinutes,
        allowBackToBack: preferences.allowBackToBack,
        lunchBreakStart: preferences.lunchBreakStart,
        lunchBreakEnd: preferences.lunchBreakEnd,
        preferredMeetingType: preferences.preferredMeetingType,
        allowSameDayScheduling: preferences.allowSameDayScheduling,
        minimumNoticeHours: preferences.minimumNoticeHours
      } : null,
      metadata: {
        totalBookings: bookings.length,
        totalCalendarConnections: calendarConnections.length,
        dataVersion: '1.0'
      }
    }
    
    const jsonData = JSON.stringify(exportData, null, 2)
    
    return new NextResponse(jsonData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="calendarsync-data-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
    
  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}