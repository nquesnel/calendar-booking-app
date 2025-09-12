import { addMinutes, isWithinInterval, startOfDay, endOfDay, addDays, setHours, setMinutes, isBefore, isAfter, differenceInMinutes } from 'date-fns'

interface CalendarEvent {
  start: Date
  end: Date
}

interface TimeSlot {
  start: Date
  end: Date
  score: number
}

const WORK_HOURS = {
  start: 9,
  end: 17,
  preferredStart: 10,
  preferredEnd: 16,
}

const SLOT_PREFERENCES = {
  morning: { start: 9, end: 12, weight: 0.8 },
  earlyAfternoon: { start: 13, end: 15, weight: 1.0 },
  lateAfternoon: { start: 15, end: 17, weight: 0.6 },
}

export function findOptimalMeetingTimes(
  creatorEvents: CalendarEvent[],
  recipientEvents: CalendarEvent[],
  duration: number = 30,
  timezone: string = 'UTC',
  daysAhead: number = 7
): TimeSlot[] {
  const allEvents = [...creatorEvents, ...recipientEvents].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  )
  
  const now = new Date()
  const searchStart = addMinutes(now, 60)
  const searchEnd = addDays(now, daysAhead)
  
  const availableSlots: TimeSlot[] = []
  
  for (let day = 0; day < daysAhead; day++) {
    const currentDay = addDays(now, day)
    const dayStart = setMinutes(setHours(currentDay, WORK_HOURS.start), 0)
    const dayEnd = setMinutes(setHours(currentDay, WORK_HOURS.end), 0)
    
    if (isBefore(dayEnd, searchStart)) continue
    
    const daySlots = findDayAvailableSlots(
      dayStart,
      dayEnd,
      allEvents,
      duration
    )
    
    daySlots.forEach(slot => {
      const hour = slot.start.getHours()
      // STRICT business hours validation - NO times outside 9am-5pm
      if (hour >= 9 && hour < 17 && isAfter(slot.start, searchStart) && isBefore(slot.start, searchEnd)) {
        const score = calculateSlotScore(slot, timezone)
        availableSlots.push({ ...slot, score })
      }
    })
  }
  
  availableSlots.sort((a, b) => b.score - a.score)
  
  return availableSlots.slice(0, 5)
}

function findDayAvailableSlots(
  dayStart: Date,
  dayEnd: Date,
  events: CalendarEvent[],
  duration: number
): TimeSlot[] {
  const slots: TimeSlot[] = []
  let currentTime = dayStart
  
  const dayEvents = events.filter(event => 
    isWithinInterval(event.start, { start: dayStart, end: dayEnd }) ||
    isWithinInterval(event.end, { start: dayStart, end: dayEnd })
  )
  
  for (const event of dayEvents) {
    if (differenceInMinutes(event.start, currentTime) >= duration) {
      slots.push({
        start: currentTime,
        end: addMinutes(currentTime, duration),
        score: 0
      })
    }
    currentTime = isAfter(event.end, currentTime) ? event.end : currentTime
  }
  
  if (differenceInMinutes(dayEnd, currentTime) >= duration) {
    let slotStart = currentTime
    while (differenceInMinutes(dayEnd, slotStart) >= duration) {
      slots.push({
        start: slotStart,
        end: addMinutes(slotStart, duration),
        score: 0
      })
      slotStart = addMinutes(slotStart, 30)
    }
  }
  
  return slots
}

function calculateSlotScore(slot: TimeSlot, timezone: string): number {
  let score = 0.5
  
  const hour = slot.start.getHours()
  const minute = slot.start.getMinutes()
  const time = hour + minute / 60
  
  if (time >= SLOT_PREFERENCES.morning.start && time < SLOT_PREFERENCES.morning.end) {
    score += SLOT_PREFERENCES.morning.weight
  } else if (time >= SLOT_PREFERENCES.earlyAfternoon.start && time < SLOT_PREFERENCES.earlyAfternoon.end) {
    score += SLOT_PREFERENCES.earlyAfternoon.weight
  } else if (time >= SLOT_PREFERENCES.lateAfternoon.start && time < SLOT_PREFERENCES.lateAfternoon.end) {
    score += SLOT_PREFERENCES.lateAfternoon.weight
  }
  
  if (time >= WORK_HOURS.preferredStart && time <= WORK_HOURS.preferredEnd) {
    score += 0.3
  }
  
  if (minute === 0 || minute === 30) {
    score += 0.2
  }
  
  const dayOfWeek = slot.start.getDay()
  if (dayOfWeek >= 2 && dayOfWeek <= 4) {
    score += 0.2
  }
  
  const daysFromNow = Math.floor((slot.start.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (daysFromNow <= 2) {
    score += 0.3
  } else if (daysFromNow <= 4) {
    score += 0.2
  }
  
  return Math.min(score, 1.0)
}

export function getSuggestedTimes(
  creatorBusySlots: CalendarEvent[],
  recipientBusySlots: CalendarEvent[],
  duration: number = 30,
  timezone: string = 'UTC'
): TimeSlot[] {
  const suggestions = findOptimalMeetingTimes(
    creatorBusySlots,
    recipientBusySlots,
    duration,
    timezone
  )
  
  // Enhanced scoring for mutual availability
  return suggestions
    .map(slot => ({
      ...slot,
      score: enhancedMutualScore(slot, creatorBusySlots, recipientBusySlots, timezone)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5) // Show top 5 instead of 3 for better options
}

function enhancedMutualScore(
  slot: TimeSlot,
  creatorBusySlots: CalendarEvent[],
  recipientBusySlots: CalendarEvent[],
  timezone: string
): number {
  let score = calculateSlotScore(slot, timezone)
  
  // Bonus for times with buffer around meetings for both parties
  const bufferMinutes = 15
  const hasCreatorBuffer = !creatorBusySlots.some(event => 
    Math.abs(event.end.getTime() - slot.start.getTime()) < bufferMinutes * 60 * 1000 ||
    Math.abs(slot.end.getTime() - event.start.getTime()) < bufferMinutes * 60 * 1000
  )
  
  const hasRecipientBuffer = !recipientBusySlots.some(event => 
    Math.abs(event.end.getTime() - slot.start.getTime()) < bufferMinutes * 60 * 1000 ||
    Math.abs(slot.end.getTime() - event.start.getTime()) < bufferMinutes * 60 * 1000
  )
  
  if (hasCreatorBuffer && hasRecipientBuffer) {
    score += 0.3 // Bonus for buffer time
  }
  
  // Bonus for times that avoid back-to-back meetings
  const isCreatorFree = !creatorBusySlots.some(event => 
    event.end.getTime() === slot.start.getTime()
  )
  
  const isRecipientFree = !recipientBusySlots.some(event => 
    event.end.getTime() === slot.start.getTime()
  )
  
  if (isCreatorFree && isRecipientFree) {
    score += 0.2 // Avoid back-to-back fatigue
  }
  
  return Math.min(score, 1.0)
}