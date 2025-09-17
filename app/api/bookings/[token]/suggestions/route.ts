import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getGoogleCalendarEvents } from '@/lib/calendar/google'
import { getMicrosoftCalendarEvents } from '@/lib/calendar/microsoft'
import { getSuggestedTimesWithPreferences } from '@/lib/calendar/enhanced-scheduler'
import { getSmartSuggestions } from '@/lib/calendar/smart-scheduler'
import { addDays } from 'date-fns'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const startTime = Date.now() // Start timing analysis
  let conflictsAvoided = 0
  
  try {
    const { token } = await params
    console.log(`🔍 Suggestions API called for token: ${token}`)
    
    const booking = await prisma.booking.findUnique({
      where: {
        shareToken: token
      },
      include: {
        participants: true,
        creator: true
      }
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Handle group meetings vs 1-on-1 meetings differently
    if (booking.isGroupMeeting) {
      // GROUP MEETING LOGIC
      console.log(`👥 Group meeting with ${booking.participants.length + 1} total participants`)
      
      // Get all participant emails (including creator)
      const allParticipantEmails = [
        booking.creatorEmail,
        ...booking.participants.map(p => p.email)
      ]
      
      // Check if all participants have connected calendars
      const participantCalendarStatus = await Promise.all(
        allParticipantEmails.map(async (email) => {
          const tokens = await prisma.calendarToken.findMany({
            where: { email }
          })
          return {
            email,
            connected: tokens.length > 0,
            tokenCount: tokens.length,
            tokens
          }
        })
      )
      
      const connectedParticipants = participantCalendarStatus.filter(p => p.connected)
      const missingParticipants = participantCalendarStatus.filter(p => !p.connected)
      
      console.log(`📈 Group Calendar Status: ${connectedParticipants.length}/${allParticipantEmails.length} connected`)
      
      // Check if deadline has passed
      const now = new Date()
      const deadlinePassed = booking.participantDeadline && now > booking.participantDeadline
      
      // If not everyone connected and deadline hasn't passed, return waiting state
      if (connectedParticipants.length < allParticipantEmails.length && !deadlinePassed) {
        return NextResponse.json({
          error: `Waiting for ${missingParticipants.length} participant(s) to connect their calendar`,
          groupMeetingStatus: {
            totalParticipants: allParticipantEmails.length,
            connectedParticipants: connectedParticipants.length,
            missingParticipants: missingParticipants.map(p => p.email),
            deadline: booking.participantDeadline,
            deadlinePassed: false
          }
        }, { status: 202 }) // 202 = Accepted but not ready
      }
      
      // Proceed with whoever is connected (all connected OR deadline passed)
      console.log(`🚀 Proceeding with group analysis: ${connectedParticipants.length} participants`)
      
    } else {
      // REGULAR 1-ON-1 MEETING LOGIC
      // Get ALL calendar tokens for creator (multiple accounts per provider)
      const creatorTokens = await prisma.calendarToken.findMany({
        where: {
          email: booking.creatorEmail
        }
      })

      // Get ALL calendar tokens for recipient
      let recipientTokens: any[] = []
      console.log(`🔍 Looking for recipient tokens:`, {
        recipientEmail: booking.recipientEmail,
        recipientId: booking.recipientId
      })
      
      if (booking.recipientEmail) {
        recipientTokens = await prisma.calendarToken.findMany({
          where: {
            email: booking.recipientEmail
          }
        })
        console.log(`📧 Found ${recipientTokens.length} tokens for email: ${booking.recipientEmail}`)
      } else if (booking.recipientId) {
        recipientTokens = await prisma.calendarToken.findMany({
          where: {
            userId: booking.recipientId
          }
        })
        console.log(`👤 Found ${recipientTokens.length} tokens for userId: ${booking.recipientId}`)
      } else {
        console.log(`⚠️ No recipientEmail or recipientId set in booking`)
      }

      if (recipientTokens.length === 0) {
        console.log(`❌ No calendar tokens found for recipient - this is likely the bug!`)
        return NextResponse.json(
          { error: 'Recipient calendar not connected. Please connect your calendar first.' },
          { status: 400 }
        )
      }
    }

    // Fetch calendar data for ALL participants
    const timeMin = new Date()
    const timeMax = addDays(new Date(), 7)
    
    const participantCalendarData: Record<string, any[]> = {}
    
    // Declare variables in outer scope for group meetings
    let connectedParticipants: any[] = []
    let allParticipantEmails: string[] = []
    
    if (booking.isGroupMeeting) {
      // Get all participant emails (defined earlier in first group meeting block)
      allParticipantEmails = [
        booking.creatorEmail,
        booking.recipientEmail,
        ...((booking as any).participants?.map((p: any) => p.email) || [])
      ].filter(Boolean) as string[]
      
      // Get connected participants  
      const participantCalendarStatus = await Promise.all(
        allParticipantEmails.map(async (email) => {
          const tokens = await prisma.calendarToken.findMany({
            where: { email }
          })
          
          return {
            email,
            connected: tokens.length > 0,
            tokenCount: tokens.length,
            tokens
          }
        })
      )
      
      connectedParticipants = participantCalendarStatus.filter(p => p.connected)
      
      // GROUP MEETING: Fetch calendars for all connected participants
      for (const participantStatus of connectedParticipants) {
        const { email, tokens } = participantStatus
        let allEvents: any[] = []
        
        for (const token of tokens) {
          try {
            let events: any[] = []
            if (token.provider === 'google') {
              events = await getGoogleCalendarEvents(token.accessToken, timeMin, timeMax, token)
            } else if (token.provider === 'microsoft') {
              events = await getMicrosoftCalendarEvents(token.accessToken, timeMin, timeMax)
            }
            
            const calendarEvents = events.map((e: any) => ({
              start: new Date(e.start?.dateTime || e.start?.date),
              end: new Date(e.end?.dateTime || e.end?.date),
              calendarAccount: token.email,
              participant: email
            }))
            
            allEvents.push(...calendarEvents)
          } catch (error) {
            console.error(`Error fetching calendar events for ${email} (${token.email}):`, error)
          }
        }
        
        participantCalendarData[email] = allEvents
      }
      
    } else {
      // REGULAR 1-ON-1 MEETING: Use existing logic
      const creatorTokens = await prisma.calendarToken.findMany({
        where: { email: booking.creatorEmail }
      })
      const recipientTokens = await prisma.calendarToken.findMany({
        where: { email: booking.recipientEmail }
      })
      
      // Fetch creator events
      let creatorBusySlots: any[] = []
      for (const token of creatorTokens) {
        try {
          let events: any[] = []
          if (token.provider === 'google') {
            events = await getGoogleCalendarEvents(token.accessToken, timeMin, timeMax)
          } else if (token.provider === 'microsoft') {
            events = await getMicrosoftCalendarEvents(token.accessToken, timeMin, timeMax)
          }
          
          const calendarEvents = events.map((e: any) => ({
            start: new Date(e.start?.dateTime || e.start?.date),
            end: new Date(e.end?.dateTime || e.end?.date),
            calendarAccount: token.email
          }))
          
          creatorBusySlots.push(...calendarEvents)
        } catch (error) {
          console.error(`Error fetching creator calendar events for ${token.email}:`, error)
        }
      }
      
      // Fetch recipient events
      let recipientBusySlots: any[] = []
      for (const token of recipientTokens) {
        try {
          let events: any[] = []
          if (token.provider === 'google') {
            events = await getGoogleCalendarEvents(token.accessToken, timeMin, timeMax)
          } else if (token.provider === 'microsoft') {
            events = await getMicrosoftCalendarEvents(token.accessToken, timeMin, timeMax)
          }
          
          const calendarEvents = events.map((e: any) => ({
            start: new Date(e.start?.dateTime || e.start?.date),
            end: new Date(e.end?.dateTime || e.end?.date),
            calendarAccount: token.email
          }))
          
          recipientBusySlots.push(...calendarEvents)
        } catch (error) {
          console.error(`Error fetching recipient calendar events for ${token.email}:`, error)
        }
      }
      
      participantCalendarData[booking.creatorEmail] = creatorBusySlots
      if (booking.recipientEmail) {
        participantCalendarData[booking.recipientEmail] = recipientBusySlots
      }
    }

    // Log calendar data for debugging
    console.log(`🗓️ ${booking.isGroupMeeting ? 'Group' : '1-on-1'} Meeting Analysis for Booking ${token}:`)
    
    Object.entries(participantCalendarData).forEach(([email, events]) => {
      console.log(`  ${email}: ${events.length} busy slots`)
    })
    
    const totalBusySlots = Object.values(participantCalendarData).flat().length
    console.log(`  Total busy slots across all participants: ${totalBusySlots}`)

    // Prepare organizer preferences
    const organizerPrefs = {
      timeUrgency: (booking.timeUrgency || 'flexible') as 'urgent' | 'flexible',
      roughTimeframe: booking.roughTimeframe,
      timeOfDayPref: booking.timeOfDayPref,
      avoidDays: booking.avoidDays,
      preferredDays: booking.preferredDays
    }

    // Prepare data for AI scheduler
    let creatorBusySlots: any[]
    let recipientEmails: string[]
    let recipientBusySlotsMap: Record<string, any[]>
    
    if (booking.isGroupMeeting) {
      // GROUP MEETING: Organizer + all participants
      creatorBusySlots = participantCalendarData[booking.creatorEmail] || []
      recipientEmails = Object.keys(participantCalendarData).filter(email => email !== booking.creatorEmail)
      recipientBusySlotsMap = {}
      
      recipientEmails.forEach(email => {
        recipientBusySlotsMap[email] = participantCalendarData[email] || []
      })
      
      console.log(`🤖 AI analyzing: Creator (${creatorBusySlots.length} events) + ${recipientEmails.length} participants`)
      
    } else {
      // 1-ON-1 MEETING: Existing logic
      creatorBusySlots = participantCalendarData[booking.creatorEmail] || []
      recipientEmails = booking.recipientEmail ? [booking.recipientEmail] : []
      recipientBusySlotsMap = {}
      if (booking.recipientEmail) {
        recipientBusySlotsMap[booking.recipientEmail] = participantCalendarData[booking.recipientEmail] || []
      }
    }

    console.log('🎯 Using Smart AI Scheduler with preferences:', organizerPrefs)

    // Count total busy slots (conflicts to avoid)
    const totalBusySlots = creatorBusySlots.length + 
      Object.values(recipientBusySlotsMap).reduce((total, slots) => total + slots.length, 0)
    conflictsAvoided = totalBusySlots

    const suggestions = await getSmartSuggestions(
      booking.creatorEmail,
      recipientEmails,
      creatorBusySlots,
      recipientBusySlotsMap,
      booking.duration,
      organizerPrefs,
      booking.timeZone
    )

    console.log(`Generated ${suggestions.length} suggestions for mutual availability:`, suggestions)

    // Save suggestions to database with enhanced info
    const savedSuggestions = await Promise.all(
      suggestions.map(async (suggestion, index) => {
        return await prisma.timeSuggestion.create({
          data: {
            bookingId: booking.id,
            startTime: suggestion.start,
            endTime: suggestion.end,
            score: suggestion.score
          }
        })
      })
    )

    // Add enhanced suggestion info for frontend
    const enhancedSuggestions = savedSuggestions.map((saved, index) => ({
      ...saved,
      contextLabel: suggestions[index]?.contextLabel || '',
      reasoning: suggestions[index]?.reasoning || '',
      isBestMatch: suggestions[index]?.isBestMatch || false
    }))

    // Calculate analysis timing
    const analysisTime = (Date.now() - startTime) / 1000 // Convert to seconds
    
    return NextResponse.json({
      suggestions: enhancedSuggestions,
      analytics: {
        analysisTime: analysisTime.toFixed(1), // e.g., "0.3"
        conflictsAvoided: conflictsAvoided,
        calendarsAnalyzed: 1 + recipientEmails.length
      }
    })
  } catch (error) {
    console.error('💥 Error generating suggestions:', error)
    console.error('💥 Error details:', error.message, error.stack)
    return NextResponse.json(
      { error: `Failed to generate suggestions: ${error.message}` },
      { status: 500 }
    )
  }
}