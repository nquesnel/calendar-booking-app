import { addMinutes, isWithinInterval, addDays, setHours, setMinutes, isBefore, isAfter, differenceInMinutes, getDay, format } from 'date-fns'
import { prisma } from '@/lib/db'

interface CalendarEvent {
  start: Date
  end: Date
}

interface TimeSlot {
  start: Date
  end: Date
  score: number
}

interface UserPreferences {
  earliestStartTime: string
  latestEndTime: string
  preferredDays: string
  avoidDays?: string | null
  bufferMinutes: number
  allowBackToBack: boolean
  lunchBreakStart: string
  lunchBreakEnd: string
  preferredMeetingType: string
  allowSameDayScheduling: boolean
  minimumNoticeHours: number
}

interface ParticipantData {
  events: CalendarEvent[]
  preferences?: UserPreferences | null
}

const DEFAULT_PREFERENCES: UserPreferences = {
  earliestStartTime: '09:00',
  latestEndTime: '17:00',
  preferredDays: '1,2,3,4,5', // Mon-Fri
  avoidDays: null,
  bufferMinutes: 15,
  allowBackToBack: false,
  lunchBreakStart: '12:00',
  lunchBreakEnd: '13:00',
  preferredMeetingType: 'video',
  allowSameDayScheduling: false,
  minimumNoticeHours: 24
}

function parseTime(timeStr: string): { hours: number, minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return { hours, minutes }
}

function isTimeInRange(date: Date, startTime: string, endTime: string): boolean {
  const time = format(date, 'HH:mm')
  return time >= startTime && time <= endTime
}

function isDayPreferred(date: Date, preferredDays: string, avoidDays?: string | null): boolean {
  const dayOfWeek = getDay(date) // 0=Sun, 1=Mon...6=Sat
  const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek // Convert to 1=Mon...7=Sun
  
  const preferred = preferredDays.split(',').map(d => parseInt(d))
  const avoided = avoidDays ? avoidDays.split(',').map(d => parseInt(d)) : []
  
  return preferred.includes(adjustedDay) && !avoided.includes(adjustedDay)
}

function calculatePreferenceScore(slot: TimeSlot, preferences: UserPreferences): number {
  let score = 0.5
  
  // Time of day scoring
  if (isTimeInRange(slot.start, preferences.earliestStartTime, preferences.latestEndTime)) {
    score += 0.3
  } else {
    score -= 0.4 // Penalty for outside preferred hours
  }
  
  // Day of week scoring
  if (isDayPreferred(slot.start, preferences.preferredDays, preferences.avoidDays)) {
    score += 0.2
  } else {
    score -= 0.3 // Penalty for non-preferred days
  }
  
  // Avoid lunch break
  if (isTimeInRange(slot.start, preferences.lunchBreakStart, preferences.lunchBreakEnd) ||
      isTimeInRange(slot.end, preferences.lunchBreakStart, preferences.lunchBreakEnd)) {
    score -= 0.2
  }
  
  // Prefer certain times of day
  const hour = slot.start.getHours()
  if (hour >= 10 && hour <= 11) score += 0.15 // Morning sweet spot
  if (hour >= 14 && hour <= 15) score += 0.15 // Afternoon sweet spot
  
  // Round times (on the hour or half hour) get bonus
  if (slot.start.getMinutes() === 0 || slot.start.getMinutes() === 30) {
    score += 0.1
  }
  
  return Math.min(Math.max(score, 0), 1)
}

function hasConflict(slot: TimeSlot, events: CalendarEvent[], bufferMinutes: number): boolean {
  const slotStart = slot.start.getTime()
  const slotEnd = slot.end.getTime()
  const buffer = bufferMinutes * 60 * 1000
  
  for (const event of events) {
    const eventStart = event.start.getTime()
    const eventEnd = event.end.getTime()
    
    // Check for direct overlap
    if (slotStart < eventEnd && slotEnd > eventStart) {
      return true
    }
    
    // Check for buffer violations
    if (Math.abs(slotEnd - eventStart) < buffer || Math.abs(eventEnd - slotStart) < buffer) {
      return true
    }
  }
  
  return false
}

export async function findOptimalMeetingTimesWithPreferences(
  creatorEmail: string,
  recipientEmails: string[],
  duration: number = 30,
  timezone: string = 'UTC',
  daysAhead: number = 7,
  participantData: Record<string, ParticipantData> = {}
): Promise<TimeSlot[]> {
  
  // Get user preferences for all participants
  const allEmails = [creatorEmail, ...recipientEmails]
  const userPreferences: Record<string, UserPreferences> = {}
  
  for (const email of allEmails) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { preferences: true }
      })
      
      if (user?.preferences) {
        userPreferences[email] = {
          earliestStartTime: user.preferences.earliestStartTime,
          latestEndTime: user.preferences.latestEndTime,
          preferredDays: user.preferences.preferredDays,
          avoidDays: user.preferences.avoidDays,
          bufferMinutes: user.preferences.bufferMinutes,
          allowBackToBack: user.preferences.allowBackToBack,
          lunchBreakStart: user.preferences.lunchBreakStart,
          lunchBreakEnd: user.preferences.lunchBreakEnd,
          preferredMeetingType: user.preferences.preferredMeetingType,
          allowSameDayScheduling: user.preferences.allowSameDayScheduling,
          minimumNoticeHours: user.preferences.minimumNoticeHours
        }
      } else {
        userPreferences[email] = DEFAULT_PREFERENCES
      }
    } catch (error) {
      console.error(`Error loading preferences for ${email}:`, error)
      userPreferences[email] = DEFAULT_PREFERENCES
    }
  }
  
  const availableSlots: TimeSlot[] = []
  const now = new Date()
  
  // Calculate the earliest possible start time based on minimum notice requirements
  const earliestNoticeHours = Math.max(...allEmails.map(email => 
    userPreferences[email].minimumNoticeHours
  ))
  const searchStart = addMinutes(now, earliestNoticeHours * 60)
  
  // For each day in the search period
  for (let day = 0; day < daysAhead; day++) {
    const currentDay = addDays(now, day)
    
    // Check same-day scheduling restrictions
    const sameDayBlocked = allEmails.some(email => {
      const prefs = userPreferences[email]
      const isToday = currentDay.toDateString() === now.toDateString()
      return isToday && !prefs.allowSameDayScheduling
    })
    
    if (sameDayBlocked) {
      console.log(`Skipping ${currentDay.toDateString()} - same-day scheduling blocked`)
      continue
    }
    
    // Skip if this day is avoided by any participant
    const dayAvoidedByAny = allEmails.some(email => {
      const prefs = userPreferences[email]
      const dayPreferred = isDayPreferred(currentDay, prefs.preferredDays, prefs.avoidDays)
      if (!dayPreferred) {
        console.log(`Skipping ${currentDay.toDateString()} for ${email} - day not in preferred days`)
      }
      return !dayPreferred
    })
    
    if (dayAvoidedByAny) continue
    
    // Find the most restrictive time window for this day
    let latestStart = '09:00'
    let earliestEnd = '17:00'
    
    for (const email of allEmails) {
      const prefs = userPreferences[email]
      if (prefs.earliestStartTime > latestStart) latestStart = prefs.earliestStartTime
      if (prefs.latestEndTime < earliestEnd) earliestEnd = prefs.latestEndTime
    }
    
    const startTime = parseTime(latestStart)
    const endTime = parseTime(earliestEnd)
    
    const dayStart = setMinutes(setHours(currentDay, startTime.hours), startTime.minutes)
    const dayEnd = setMinutes(setHours(currentDay, endTime.hours), endTime.minutes)
    
    // Skip if the available window is too small
    if (differenceInMinutes(dayEnd, dayStart) < duration) continue
    
    // Generate potential slots every 15 minutes
    let slotStart = dayStart
    while (isBefore(addMinutes(slotStart, duration), dayEnd)) {
      if (isBefore(slotStart, searchStart)) {
        slotStart = addMinutes(slotStart, 15)
        continue
      }
      
      const slot: TimeSlot = {
        start: slotStart,
        end: addMinutes(slotStart, duration),
        score: 0
      }
      
      // Check if this slot conflicts with any participant's events or preferences
      let hasAnyConflict = false
      let totalScore = 0
      let scoreCount = 0
      
      for (const email of allEmails) {
        const data = participantData[email]
        const prefs = userPreferences[email]
        
        if (data?.events) {
          // Check for calendar conflicts
          if (hasConflict(slot, data.events, prefs.bufferMinutes)) {
            hasAnyConflict = true
            break
          }
        }
        
        // Calculate preference score
        const prefScore = calculatePreferenceScore(slot, prefs)
        totalScore += prefScore
        scoreCount++
      }
      
      if (!hasAnyConflict && scoreCount > 0) {
        slot.score = totalScore / scoreCount // Average score across all participants
        availableSlots.push(slot)
      }
      
      slotStart = addMinutes(slotStart, 15)
    }
  }
  
  // Sort by score (highest first) 
  const sortedSlots = availableSlots.sort((a, b) => b.score - a.score)
  
  // Implement time diversity - spread suggestions across different time periods
  const diverseSuggestions: TimeSlot[] = []
  const timePeriods = {
    morning: [] as TimeSlot[],    // 6 AM - 11:59 AM
    midday: [] as TimeSlot[],     // 12 PM - 2:59 PM  
    afternoon: [] as TimeSlot[],  // 3 PM - 6:59 PM
    evening: [] as TimeSlot[],    // 7 PM - 9 PM
    nextDay: [] as TimeSlot[]     // Next day options
  }
  
  // Categorize all slots by time period
  sortedSlots.forEach(slot => {
    const hour = slot.start.getHours()
    const isToday = slot.start.toDateString() === new Date().toDateString()
    
    if (!isToday) {
      timePeriods.nextDay.push(slot)
    } else if (hour >= 6 && hour < 12) {
      timePeriods.morning.push(slot)
    } else if (hour >= 12 && hour < 15) {
      timePeriods.midday.push(slot)
    } else if (hour >= 15 && hour < 19) {
      timePeriods.afternoon.push(slot)
    } else if (hour >= 19 && hour <= 21) {
      timePeriods.evening.push(slot)
    }
  })
  
  // Select best option from each time period for diversity
  // Priority order: morning, afternoon, midday, evening, nextDay
  const periods = ['morning', 'afternoon', 'midday', 'evening', 'nextDay'] as const
  
  for (const period of periods) {
    if (timePeriods[period].length > 0 && diverseSuggestions.length < 5) {
      // Take the highest scoring slot from this time period
      diverseSuggestions.push(timePeriods[period][0])
    }
  }
  
  // If we don't have 5 suggestions yet, fill with next highest scoring slots
  // but ensure they're at least 2 hours apart for time diversity
  if (diverseSuggestions.length < 5) {
    for (const slot of sortedSlots) {
      if (diverseSuggestions.length >= 5) break
      
      // Check if this slot is at least 2 hours away from existing suggestions
      const tooClose = diverseSuggestions.some(existing => {
        const timeDiff = Math.abs(slot.start.getTime() - existing.start.getTime())
        return timeDiff < 2 * 60 * 60 * 1000 // 2 hours in milliseconds
      })
      
      if (!tooClose && !diverseSuggestions.includes(slot)) {
        diverseSuggestions.push(slot)
      }
    }
  }
  
  return diverseSuggestions.slice(0, 5)
}

export async function getSuggestedTimesWithPreferences(
  creatorEmail: string,
  recipientEmails: string[],
  creatorBusySlots: CalendarEvent[],
  recipientBusySlots: Record<string, CalendarEvent[]>,
  duration: number = 30,
  timezone: string = 'UTC'
): Promise<TimeSlot[]> {
  
  // Prepare participant data
  const participantData: Record<string, ParticipantData> = {}
  participantData[creatorEmail] = { events: creatorBusySlots }
  
  recipientEmails.forEach(email => {
    participantData[email] = { events: recipientBusySlots[email] || [] }
  })
  
  const suggestions = await findOptimalMeetingTimesWithPreferences(
    creatorEmail,
    recipientEmails,
    duration,
    timezone,
    7, // 7 days ahead
    participantData
  )
  
  return suggestions
}