import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'


export async function GET(req: NextRequest) {
  try {
    // Get user from session token
    const sessionUser = await getUserFromRequest(req)
    
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: { preferences: true, calendarTokens: true }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const hasCalendar = user.calendarTokens && user.calendarTokens.length > 0
    const calendarProvider = hasCalendar ? user.calendarTokens[0].provider : null

    return NextResponse.json({ 
      profile: {
        ...user,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username
      }, 
      preferences: user.preferences,
      calendarConnected: hasCalendar,
      calendarProvider: calendarProvider
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { profileDefaults, preferences } = body
    
    // Get user from session token
    const sessionUser = await getUserFromRequest(req)
    
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: { preferences: true }
    })
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update user profile defaults
    if (profileDefaults) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          defaultVideoLink: profileDefaults.defaultVideoLink || null,
          defaultPhoneNumber: profileDefaults.defaultPhoneNumber || null,
          defaultAddress: profileDefaults.defaultAddress || null,
          defaultMeetingNotes: profileDefaults.defaultMeetingNotes || null,
        }
      })
    }

    // Update user preferences
    if (preferences) {
      // User already loaded above with preferences

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      if (user.preferences) {
        // Update existing preferences
        await prisma.userPreference.update({
          where: { userId: user.id },
          data: {
            earliestStartTime: preferences.earliestStartTime,
            latestEndTime: preferences.latestEndTime,
            preferredDays: preferences.preferredDays,
            avoidDays: preferences.avoidDays || null,
            bufferMinutes: preferences.bufferMinutes,
            allowBackToBack: preferences.allowBackToBack,
            lunchBreakStart: preferences.lunchBreakStart,
            lunchBreakEnd: preferences.lunchBreakEnd,
            preferredMeetingType: preferences.preferredMeetingType,
            allowSameDayScheduling: preferences.allowSameDayScheduling,
            minimumNoticeHours: preferences.minimumNoticeHours,
          }
        })
      } else {
        // Create new preferences
        await prisma.userPreference.create({
          data: {
            userId: user.id,
            earliestStartTime: preferences.earliestStartTime,
            latestEndTime: preferences.latestEndTime,
            preferredDays: preferences.preferredDays,
            avoidDays: preferences.avoidDays || null,
            bufferMinutes: preferences.bufferMinutes,
            allowBackToBack: preferences.allowBackToBack,
            lunchBreakStart: preferences.lunchBreakStart,
            lunchBreakEnd: preferences.lunchBreakEnd,
            preferredMeetingType: preferences.preferredMeetingType,
            allowSameDayScheduling: preferences.allowSameDayScheduling,
            minimumNoticeHours: preferences.minimumNoticeHours,
          }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}