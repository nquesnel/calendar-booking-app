import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXT_PUBLIC_APP_URL + '/api/auth/google/callback'
)

export function getGoogleAuthUrl(state: string): string {
  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ]

  // Force fresh consent to ensure all scopes are granted
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: state,
    prompt: 'consent',
    include_granted_scopes: true
  })
  
  console.log('Generated OAuth URL with scopes:', scopes, 'URL:', authUrl)
  return authUrl
}

export async function getGoogleTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function refreshGoogleToken(refreshToken: string) {
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await oauth2Client.refreshAccessToken()
  return credentials
}

async function executeWithTokenRefresh(
  calendarToken: any,
  operation: () => Promise<any>
) {
  try {
    oauth2Client.setCredentials({ access_token: calendarToken.accessToken })
    return await operation()
  } catch (error: any) {
    // If token is expired, try to refresh
    if (error.code === 401 && calendarToken.refreshToken) {
      console.log('Access token expired, attempting refresh...')
      try {
        const { prisma } = await import('@/lib/db')
        const newTokens = await refreshGoogleToken(calendarToken.refreshToken)
        
        // Update the token in database
        await prisma.calendarToken.update({
          where: { id: calendarToken.id },
          data: {
            accessToken: newTokens.access_token!,
            expiresAt: newTokens.expiry_date ? new Date(newTokens.expiry_date) : undefined
          }
        })
        
        console.log('Token refreshed successfully')
        oauth2Client.setCredentials({ access_token: newTokens.access_token! })
        return await operation()
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        throw error
      }
    }
    throw error
  }
}

export async function getGoogleCalendarEvents(
  accessToken: string,
  timeMin: Date,
  timeMax: Date,
  calendarToken?: any
) {
  const operation = async () => {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })
    
    return response.data.items || []
  }
  
  if (calendarToken) {
    return await executeWithTokenRefresh(calendarToken, operation)
  } else {
    oauth2Client.setCredentials({ access_token: accessToken })
    return await operation()
  }
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  event: {
    summary: string
    description?: string
    start: Date
    end: Date
    attendees?: { email: string }[]
  }
) {
  oauth2Client.setCredentials({ access_token: accessToken })
  
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  
  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: {
        dateTime: event.start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: event.end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: event.attendees,
      reminders: {
        useDefault: true,
      },
    },
  })
  
  return response.data
}

export async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  event: {
    summary: string
    description?: string
    start: Date
    end: Date
    attendees?: { email: string }[]
  }
) {
  oauth2Client.setCredentials({ access_token: accessToken })
  
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  
  const response = await calendar.events.update({
    calendarId: 'primary',
    eventId: eventId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: {
        dateTime: event.start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: event.end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: event.attendees,
      reminders: {
        useDefault: true,
      },
    },
  })
  
  return response.data
}