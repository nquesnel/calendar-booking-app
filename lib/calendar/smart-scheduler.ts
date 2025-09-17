import { addMinutes, addDays, setHours, setMinutes, isBefore, isAfter, getDay, format, startOfWeek, endOfWeek, differenceInMinutes } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { prisma } from '@/lib/db'

interface CalendarEvent {
  start: Date
  end: Date
}

interface SmartTimeSlot {
  start: Date
  end: Date
  score: number
  contextLabel: string
  reasoning: string
  isBestMatch?: boolean
}

interface OrganizerPreferences {
  timeUrgency: 'urgent' | 'flexible'
  roughTimeframe?: string | null
  timeOfDayPref?: string | null
  avoidDays?: string | null
  preferredDays?: string | null
}

interface CalendarPattern {
  morningMeetings: number
  afternoonMeetings: number
  preferredStartTime: number
  averageMeetingDuration: number
  busyDays: number[]
  totalMeetings: number
}

export async function getSmartSuggestions(
  creatorEmail: string,
  recipientEmails: string[],
  creatorBusySlots: CalendarEvent[],
  recipientBusySlots: Record<string, CalendarEvent[]>,
  duration: number = 30,
  organizerPrefs: OrganizerPreferences,
  timezone: string = 'UTC'
): Promise<SmartTimeSlot[]> {
  
  console.log('🎯 Smart AI Scheduling with organizer preferences:', organizerPrefs)
  
  // Analyze calendar patterns for context-aware suggestions
  const creatorPattern = analyzeCalendarPattern(creatorBusySlots)
  const recipientPatterns = Object.keys(recipientBusySlots).map(email => 
    analyzeCalendarPattern(recipientBusySlots[email])
  )
  
  console.log('📊 Calendar patterns:', { creator: creatorPattern, recipients: recipientPatterns })
  
  // Determine time search window based on organizer preferences
  const searchWindow = getSearchWindow(organizerPrefs)
  console.log('⏰ Search window:', searchWindow)
  
  // Generate potential time slots
  const potentialSlots = generatePotentialSlots(searchWindow, duration, organizerPrefs, timezone)
  console.log(`🎲 Generated ${potentialSlots.length} potential slots`)
  
  // Filter available slots (no conflicts)
  const availableSlots = filterAvailableSlots(potentialSlots, creatorBusySlots, recipientBusySlots)
  console.log(`✅ ${availableSlots.length} slots available after filtering conflicts`)
  
  // Score and rank slots with intelligent reasoning
  const scoredSlots = scoreSlots(
    availableSlots,
    organizerPrefs,
    creatorPattern,
    recipientPatterns,
    duration
  )
  
  // Apply smart distribution logic (5 suggestions across 2-3 days with variety)
  const smartSuggestions = applySmartDistribution(scoredSlots)
  
  console.log('🌟 Final smart suggestions:', smartSuggestions.map(s => ({
    time: format(s.start, 'MMM d, h:mm a'),
    score: s.score,
    label: s.contextLabel,
    reasoning: s.reasoning
  })))
  
  return smartSuggestions
}

function analyzeCalendarPattern(events: CalendarEvent[]): CalendarPattern {
  if (events.length === 0) {
    return {
      morningMeetings: 0,
      afternoonMeetings: 0,
      preferredStartTime: 10, // Default to 10am
      averageMeetingDuration: 30,
      busyDays: [],
      totalMeetings: 0
    }
  }
  
  let morningCount = 0
  let afternoonCount = 0
  let totalDuration = 0
  const dayFrequency: Record<number, number> = {}
  let totalStartTime = 0
  
  for (const event of events) {
    const hour = event.start.getHours()
    const day = getDay(event.start)
    const duration = differenceInMinutes(event.end, event.start)
    
    // Count morning vs afternoon meetings
    if (hour < 12) {
      morningCount++
    } else {
      afternoonCount++
    }
    
    // Track day frequency
    dayFrequency[day] = (dayFrequency[day] || 0) + 1
    
    // Calculate averages
    totalDuration += duration
    totalStartTime += hour + (event.start.getMinutes() / 60)
  }
  
  // Find busiest days
  const busyDays = Object.entries(dayFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([day]) => parseInt(day))
  
  return {
    morningMeetings: morningCount,
    afternoonMeetings: afternoonCount,
    preferredStartTime: Math.round(totalStartTime / events.length),
    averageMeetingDuration: Math.round(totalDuration / events.length),
    busyDays,
    totalMeetings: events.length
  }
}

function getSearchWindow(prefs: OrganizerPreferences): { start: Date, end: Date, maxDays: number } {
  const now = new Date()
  let maxDays = 7 // Default to 7 days
  
  if (prefs.timeUrgency === 'urgent') {
    maxDays = 3
  }
  
  let startDate = addDays(now, 1) // Start tomorrow
  
  if (prefs.roughTimeframe === 'this_week') {
    startDate = now
    maxDays = Math.min(maxDays, 7 - getDay(now))
  } else if (prefs.roughTimeframe === 'next_week') {
    startDate = startOfWeek(addDays(now, 7), { weekStartsOn: 1 })
    maxDays = 5 // Monday-Friday of next week
  }
  
  return {
    start: startDate,
    end: addDays(startDate, maxDays),
    maxDays
  }
}

function generatePotentialSlots(
  searchWindow: { start: Date, end: Date, maxDays: number },
  duration: number,
  prefs: OrganizerPreferences,
  timezone: string = 'UTC'
): SmartTimeSlot[] {
  const slots: SmartTimeSlot[] = []
  
  // Define time slots based on preferences
  const timeSlots = [
    { start: 9, end: 12, period: 'morning', weight: 1.0 },
    { start: 13, end: 17, period: 'afternoon', weight: 1.0 },
  ]
  
  // Adjust weights based on organizer time preference
  if (prefs.timeOfDayPref === 'morning') {
    timeSlots[0].weight = 1.3
    timeSlots[1].weight = 0.7
  } else if (prefs.timeOfDayPref === 'afternoon') {
    timeSlots[0].weight = 0.7
    timeSlots[1].weight = 1.3
  }
  
  let currentDate = searchWindow.start
  
  while (isBefore(currentDate, searchWindow.end)) {
    const dayOfWeek = getDay(currentDate)
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek // Convert to 1=Mon...7=Sun
    
    // Skip if day should be avoided
    if (prefs.avoidDays && prefs.avoidDays.split(',').includes(adjustedDay.toString())) {
      currentDate = addDays(currentDate, 1)
      continue
    }
    
    // Skip weekends unless specifically preferred
    if ([6, 7].includes(adjustedDay) && !prefs.preferredDays?.includes(adjustedDay.toString())) {
      currentDate = addDays(currentDate, 1)
      continue
    }
    
    // Generate slots for this day
    for (const timeSlot of timeSlots) {
      for (let hour = timeSlot.start; hour < timeSlot.end; hour += 0.5) {
        // Create time in user's timezone first, then convert to UTC for storage
        const localDate = toZonedTime(currentDate, timezone)
        const localSlotStart = setMinutes(setHours(localDate, Math.floor(hour)), (hour % 1) * 60)
        const slotStart = fromZonedTime(localSlotStart, timezone) // Convert to UTC
        const slotEnd = addMinutes(slotStart, duration)
        
        // Skip if slot would go past end time (check in local timezone)
        const localSlotEnd = toZonedTime(slotEnd, timezone)
        if (localSlotEnd.getHours() >= timeSlot.end) continue
        
        // Skip lunch hour (12-1pm) in local timezone
        if (hour >= 12 && hour < 13) continue
        
        let contextLabel = ''
        let reasoning = ''
        
        if (timeSlot.period === 'morning') {
          if (hour < 10) {
            contextLabel = 'Early morning focus'
            reasoning = 'Fresh start to the day with high energy'
          } else {
            contextLabel = 'Mid-morning productivity'
            reasoning = 'Peak morning focus time'
          }
        } else {
          if (hour < 15) {
            contextLabel = 'Post-lunch collaboration'
            reasoning = 'Afternoon energy for productive discussions'
          } else if (hour < 17) {
            contextLabel = 'Afternoon wrap-up'
            reasoning = 'Good time for planning and decisions'
          } else {
            contextLabel = 'End-of-day sync'
            reasoning = 'Wrapping up the workday'
          }
        }
        
        // Special labels for Fridays
        if (adjustedDay === 5) {
          contextLabel = 'End-of-week wrap-up'
          reasoning = 'Perfect for weekly reviews and planning'
        }
        
        // Special labels for Mondays
        if (adjustedDay === 1) {
          contextLabel = 'Week kickoff meeting'
          reasoning = 'Great way to start the week with alignment'
        }
        
        slots.push({
          start: slotStart,
          end: slotEnd,
          score: 0, // Will be calculated later
          contextLabel,
          reasoning
        })
      }
    }
    
    currentDate = addDays(currentDate, 1)
  }
  
  return slots
}

function filterAvailableSlots(
  slots: SmartTimeSlot[],
  creatorBusySlots: CalendarEvent[],
  recipientBusySlots: Record<string, CalendarEvent[]>
): SmartTimeSlot[] {
  return slots.filter(slot => {
    // Check creator availability
    const creatorHasConflict = creatorBusySlots.some(event =>
      slot.start < event.end && slot.end > event.start
    )
    
    if (creatorHasConflict) return false
    
    // Check all recipients availability
    for (const [email, busySlots] of Object.entries(recipientBusySlots)) {
      const hasConflict = busySlots.some(event =>
        slot.start < event.end && slot.end > event.start
      )
      if (hasConflict) return false
    }
    
    return true
  })
}

function scoreSlots(
  slots: SmartTimeSlot[],
  prefs: OrganizerPreferences,
  creatorPattern: CalendarPattern,
  recipientPatterns: CalendarPattern[],
  duration: number
): SmartTimeSlot[] {
  return slots.map(slot => {
    let score = 0.5 // Base score
    let reasoning = slot.reasoning
    
    const hour = slot.start.getHours()
    const dayOfWeek = getDay(slot.start)
    const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek
    
    // Organizer time preference bonus
    if (prefs.timeOfDayPref === 'morning' && hour < 12) {
      score += 0.3
      reasoning += ' • Matches your morning preference'
    } else if (prefs.timeOfDayPref === 'afternoon' && hour >= 13) {
      score += 0.3
      reasoning += ' • Matches your afternoon preference'
    }
    
    // Preferred days bonus
    if (prefs.preferredDays && prefs.preferredDays.split(',').includes(adjustedDay.toString())) {
      score += 0.2
      reasoning += ' • On your preferred day'
    }
    
    // Urgency bonus (earlier times for urgent)
    if (prefs.timeUrgency === 'urgent') {
      const daysFromNow = Math.floor((slot.start.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysFromNow <= 1) {
        score += 0.4
        reasoning += ' • Available soon (urgent request)'
      }
    }
    
    // Calendar pattern analysis bonus
    const allPatterns = [creatorPattern, ...recipientPatterns]
    const avgMorning = allPatterns.reduce((sum, p) => sum + p.morningMeetings, 0) / allPatterns.length
    const avgAfternoon = allPatterns.reduce((sum, p) => sum + p.afternoonMeetings, 0) / allPatterns.length
    
    if (hour < 12 && avgMorning > avgAfternoon) {
      score += 0.15
      reasoning += ' • Matches typical meeting patterns'
    } else if (hour >= 13 && avgAfternoon > avgMorning) {
      score += 0.15
      reasoning += ' • Matches typical meeting patterns'
    }
    
    // Optimal time slots bonus
    if ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16)) {
      score += 0.1
      reasoning += ' • Optimal productivity time'
    }
    
    // Round time bonus (on the hour or half hour)
    if (slot.start.getMinutes() === 0 || slot.start.getMinutes() === 30) {
      score += 0.05
    }
    
    // Avoid late in the day penalty
    if (hour >= 17) {
      score -= 0.2
      reasoning = reasoning.replace(' • ', ' • Late in day but ')
    }
    
    // Tuesday-Thursday bonus (best collaboration days)
    if ([2, 3, 4].includes(adjustedDay)) {
      score += 0.1
      reasoning += ' • Mid-week collaboration time'
    }
    
    return {
      ...slot,
      score: Math.min(Math.max(score, 0), 1),
      reasoning: reasoning.trim()
    }
  })
}

function applySmartDistribution(scoredSlots: SmartTimeSlot[]): SmartTimeSlot[] {
  // Sort by score (highest first)
  const sortedSlots = scoredSlots.sort((a, b) => b.score - a.score)
  
  if (sortedSlots.length === 0) return []
  
  const suggestions: SmartTimeSlot[] = []
  const usedDays = new Set<string>()
  const usedTimeSlots = new Set<string>()
  
  // Mark the best match
  if (sortedSlots[0]) {
    sortedSlots[0].isBestMatch = true
    sortedSlots[0].contextLabel = '⭐ Best Match - ' + sortedSlots[0].contextLabel
  }
  
  // Smart distribution: 5 suggestions across 2-3 days with variety
  for (const slot of sortedSlots) {
    if (suggestions.length >= 5) break
    
    const dayKey = format(slot.start, 'yyyy-MM-dd')
    const hourKey = slot.start.getHours().toString()
    const timeSlotKey = `${dayKey}-${Math.floor(slot.start.getHours() / 2)}` // 2-hour windows
    
    // Ensure variety in days and time slots
    const dayCount = Array.from(usedDays).length
    const canAddSameDay = suggestions.length < 3 || dayCount >= 2
    
    // Avoid clustering in same time window
    if (usedTimeSlots.has(timeSlotKey) && suggestions.length > 1) continue
    
    // Distribute across days
    if (usedDays.has(dayKey) && !canAddSameDay) continue
    
    suggestions.push(slot)
    usedDays.add(dayKey)
    usedTimeSlots.add(timeSlotKey)
  }
  
  // Ensure we have good morning/afternoon distribution
  const morningCount = suggestions.filter(s => s.start.getHours() < 13).length
  const afternoonCount = suggestions.length - morningCount
  
  // If we don't have good distribution, try to rebalance
  if (suggestions.length >= 4 && (morningCount === 0 || afternoonCount === 0)) {
    const rebalanced = rebalanceTimeDistribution(sortedSlots, suggestions)
    if (rebalanced.length > 0) return rebalanced
  }
  
  return suggestions
}

function rebalanceTimeDistribution(allSlots: SmartTimeSlot[], currentSuggestions: SmartTimeSlot[]): SmartTimeSlot[] {
  const suggestions: SmartTimeSlot[] = []
  const usedDays = new Set<string>()
  const usedHours = new Set<number>()
  
  // Sort all slots by score
  const sortedSlots = allSlots.sort((a, b) => b.score - a.score)
  
  // Strategy: Pick diverse times across different days and time periods
  for (const slot of sortedSlots) {
    const hour = slot.start.getHours()
    const dayKey = slot.start.toDateString()
    
    // Skip if outside business hours
    if (hour < 9 || hour >= 17) continue
    
    // Avoid back-to-back times (within 2 hours of existing suggestions)
    const tooCloseToExisting = suggestions.some(existing => {
      const timeDiff = Math.abs(slot.start.getTime() - existing.start.getTime())
      const hoursDiff = timeDiff / (1000 * 60 * 60)
      return hoursDiff < 2 // At least 2 hours apart
    })
    
    if (tooCloseToExisting) continue
    
    suggestions.push(slot)
    usedDays.add(dayKey)
    usedHours.add(hour)
    
    // Stop when we have enough diverse suggestions
    if (suggestions.length >= 3) break
  }
  
  // If we don't have enough, fill with best remaining slots
  if (suggestions.length < 3) {
    for (const slot of sortedSlots) {
      const hour = slot.start.getHours()
      if (hour >= 9 && hour < 17 && !suggestions.includes(slot)) {
        suggestions.push(slot)
        if (suggestions.length >= 3) break
      }
    }
  }
  
  // Mark the overall best as best match
  if (suggestions.length > 0) {
    const best = suggestions.reduce((prev, current) => 
      current.score > prev.score ? current : prev
    )
    best.isBestMatch = true
    best.contextLabel = '⭐ Best Match - ' + best.contextLabel.replace('⭐ Best Match - ', '')
  }
  
  return suggestions
    .sort((a, b) => {
      // First sort by score (highest first), then by date (earliest first) for ties
      if (Math.abs(a.score - b.score) < 0.1) {
        return a.start.getTime() - b.start.getTime()
      }
      return b.score - a.score
    })
    .slice(0, 5)
}