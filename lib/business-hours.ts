import { addHours, addDays, format, isWeekend, isAfter, isBefore, parseISO } from 'date-fns'
import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz'

// Default business hours and holidays
export const DEFAULT_BUSINESS_HOURS = {
  start: 9, // 9 AM
  end: 17,  // 5 PM
  days: [1, 2, 3, 4, 5] // Monday-Friday (1=Monday, 7=Sunday)
}

// Major US holidays (can be expanded for international)
export const DEFAULT_HOLIDAYS = [
  '2025-01-01', // New Year's Day
  '2025-01-20', // MLK Day
  '2025-02-17', // Presidents Day
  '2025-05-26', // Memorial Day
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-10-13', // Columbus Day
  '2025-11-11', // Veterans Day
  '2025-11-27', // Thanksgiving
  '2025-12-25', // Christmas
]

interface BusinessHoursConfig {
  startHour: number
  endHour: number
  businessDays: number[]
  timezone: string
  holidays?: string[]
}

/**
 * Calculate business hours elapsed between two dates
 * @param startDate - When the meeting was created
 * @param endDate - Current time or target time
 * @param config - Business hours configuration
 * @returns Number of business hours elapsed
 */
export function calculateBusinessHoursElapsed(
  startDate: Date,
  endDate: Date,
  config: BusinessHoursConfig
): number {
  const { startHour, endHour, businessDays, timezone, holidays = DEFAULT_HOLIDAYS } = config
  
  // Convert dates to organizer's timezone
  const start = toZonedTime(startDate, timezone)
  const end = toZonedTime(endDate, timezone)
  
  let businessHours = 0
  let currentDate = new Date(start)
  
  while (currentDate < end) {
    const dayOfWeek = currentDate.getDay() || 7 // Make Sunday = 7 instead of 0
    const isBusinessDay = businessDays.includes(dayOfWeek)
    const isHoliday = holidays.includes(format(currentDate, 'yyyy-MM-dd'))
    
    if (isBusinessDay && !isHoliday) {
      // Calculate business hours for this day
      const dayStart = new Date(currentDate)
      dayStart.setHours(startHour, 0, 0, 0)
      
      const dayEnd = new Date(currentDate)
      dayEnd.setHours(endHour, 0, 0, 0)
      
      // Find overlap between business hours and our time window
      const windowStart = currentDate < dayStart ? dayStart : currentDate
      const windowEnd = end < dayEnd ? end : dayEnd
      
      if (windowStart < windowEnd) {
        const hoursThisDay = (windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60)
        businessHours += hoursThisDay
      }
    }
    
    // Move to next day
    currentDate = addDays(currentDate, 1)
    currentDate.setHours(startHour, 0, 0, 0)
  }
  
  return Math.floor(businessHours)
}

/**
 * Calculate when to send the next follow-up during business hours
 * @param createdAt - When the meeting was created
 * @param businessHoursTarget - Target business hours elapsed
 * @param config - Business hours configuration
 * @returns Date when follow-up should be sent
 */
export function calculateFollowUpSendTime(
  createdAt: Date,
  businessHoursTarget: number,
  config: BusinessHoursConfig
): Date {
  const { startHour, endHour, businessDays, timezone, holidays = DEFAULT_HOLIDAYS } = config
  
  let businessHoursElapsed = 0
  let currentDate = toZonedTime(createdAt, timezone)
  
  while (businessHoursElapsed < businessHoursTarget) {
    const dayOfWeek = currentDate.getDay() || 7
    const isBusinessDay = businessDays.includes(dayOfWeek)
    const isHoliday = holidays.includes(format(currentDate, 'yyyy-MM-dd'))
    
    if (isBusinessDay && !isHoliday) {
      const hoursRemainingToday = endHour - currentDate.getHours()
      const hoursNeeded = businessHoursTarget - businessHoursElapsed
      
      if (hoursNeeded <= hoursRemainingToday) {
        // Can complete within this business day
        const targetTime = addHours(currentDate, hoursNeeded)
        return fromZonedTime(targetTime, timezone)
      } else {
        // Use remaining hours today, continue tomorrow
        businessHoursElapsed += hoursRemainingToday
      }
    }
    
    // Move to next business day
    currentDate = addDays(currentDate, 1)
    currentDate.setHours(startHour, 0, 0, 0)
  }
  
  return fromZonedTime(currentDate, timezone)
}

/**
 * Check if current time is within business hours
 * @param date - Date to check
 * @param config - Business hours configuration
 * @returns Boolean indicating if it's business hours
 */
export function isBusinessHours(date: Date, config: BusinessHoursConfig): boolean {
  const { startHour, endHour, businessDays, timezone, holidays = DEFAULT_HOLIDAYS } = config
  
  const zonedDate = toZonedTime(date, timezone)
  const dayOfWeek = zonedDate.getDay() || 7
  const hour = zonedDate.getHours()
  const isHoliday = holidays.includes(format(zonedDate, 'yyyy-MM-dd'))
  
  return (
    businessDays.includes(dayOfWeek) &&
    hour >= startHour &&
    hour < endHour &&
    !isHoliday
  )
}

/**
 * Get next business hours time slot
 * @param date - Current date
 * @param config - Business hours configuration
 * @returns Next available business hours time
 */
export function getNextBusinessHours(date: Date, config: BusinessHoursConfig): Date {
  const { startHour, businessDays, timezone, holidays = DEFAULT_HOLIDAYS } = config
  
  let nextDate = toZonedTime(date, timezone)
  
  // Keep moving forward until we hit business hours
  while (!isBusinessHours(nextDate, config)) {
    if (nextDate.getHours() >= config.endHour || !businessDays.includes(nextDate.getDay() || 7) || holidays.includes(format(nextDate, 'yyyy-MM-dd'))) {
      // Move to next business day
      nextDate = addDays(nextDate, 1)
      nextDate.setHours(startHour, 0, 0, 0)
    } else {
      // Move to business hours start time
      nextDate.setHours(startHour, 0, 0, 0)
    }
  }
  
  return fromZonedTime(nextDate, timezone)
}

/**
 * Format business hours timing for display
 * @param createdAt - When meeting was created
 * @param config - Business hours configuration
 * @returns Human-readable follow-up schedule
 */
export function getFollowUpScheduleText(createdAt: Date, config: BusinessHoursConfig): string {
  const firstFollowUp = calculateFollowUpSendTime(createdAt, 48, config)
  const secondFollowUp = calculateFollowUpSendTime(createdAt, 72, config)
  
  const firstDay = formatTz(firstFollowUp, 'EEEE', { timeZone: config.timezone })
  const secondDay = formatTz(secondFollowUp, 'EEEE', { timeZone: config.timezone })
  
  return `First: ${firstDay} (2 business days), Second: ${secondDay} (3 business days)`
}