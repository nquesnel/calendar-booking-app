import { Client } from '@microsoft/microsoft-graph-client'
import 'isomorphic-fetch'

export function getMicrosoftAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: process.env.NEXT_PUBLIC_APP_URL + '/api/auth/microsoft/callback',
    scope: 'calendars.read calendars.readwrite user.read offline_access',
    state: state,
  })
  
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
}

export async function getMicrosoftTokens(code: string) {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
    code: code,
    redirect_uri: process.env.NEXT_PUBLIC_APP_URL + '/api/auth/microsoft/callback',
    grant_type: 'authorization_code',
  })
  
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })
  
  return response.json()
}

export async function getMicrosoftCalendarEvents(
  accessToken: string,
  timeMin: Date,
  timeMax: Date
) {
  const client = Client.init({
    authProvider: (done) => {
      done(null, accessToken)
    },
  })
  
  const events = await client
    .api('/me/calendar/events')
    .filter(`start/dateTime ge '${timeMin.toISOString()}' and end/dateTime le '${timeMax.toISOString()}'`)
    .select('subject,start,end,attendees')
    .orderby('start/dateTime')
    .get()
  
  return events.value || []
}

export async function createMicrosoftCalendarEvent(
  accessToken: string,
  event: {
    summary: string
    description?: string
    start: Date
    end: Date
    attendees?: { email: string }[]
  }
) {
  const client = Client.init({
    authProvider: (done) => {
      done(null, accessToken)
    },
  })
  
  const newEvent = await client
    .api('/me/calendar/events')
    .post({
      subject: event.summary,
      body: {
        contentType: 'text',
        content: event.description || '',
      },
      start: {
        dateTime: event.start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: event.end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      attendees: event.attendees?.map(a => ({
        emailAddress: { address: a.email },
        type: 'required',
      })),
    })
  
  return newEvent
}