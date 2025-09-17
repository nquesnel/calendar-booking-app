import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

interface EmailTemplate {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailTemplate) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Syncthesis <noreply@calendarsync.app>',
      to,
      subject,
      html,
    })
    return { success: true }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}

export async function sendBulkEmails(emails: EmailTemplate[]) {
  const results = await Promise.allSettled(
    emails.map(email => sendEmail(email))
  )
  
  const successful = results.filter(result => 
    result.status === 'fulfilled' && result.value.success
  ).length
  
  const failed = results.length - successful
  
  return { successful, failed, total: results.length }
}

export function getGroupMeetingInviteEmail(
  recipientName: string,
  organizerName: string,
  meetingTitle: string,
  participantCount: number,
  deadline: string,
  shareLink: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; line-height: 1.6; color: #0f172a; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #7c3aed; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; }
          .meeting-details { background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .deadline-warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background: #7c3aed; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 500; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">👥 Group Meeting Request</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p><strong>${organizerName}</strong> has invited you to a group meeting:</p>
            <div class="meeting-details">
              <p style="margin: 5px 0;"><strong>Meeting:</strong> ${meetingTitle}</p>
              <p style="margin: 5px 0;"><strong>Total Participants:</strong> ${participantCount} people</p>
            </div>
            
            <div class="deadline-warning">
              <p style="margin: 0; color: #92400e; font-weight: 500;">⏰ Response Required By: ${deadline}</p>
              <p style="margin: 10px 0 0 0; color: #92400e; font-size: 14px;">
                If you don't connect your calendar by the deadline, the meeting may be scheduled without considering your availability.
              </p>
            </div>
            
            <p>Connect your calendar so we can find a time that works for everyone in the group:</p>
            <div style="text-align: center;">
              <a href="${shareLink}" class="button">Connect Calendar & Join Group</a>
            </div>
            <p style="color: #64748b; font-size: 14px;">Once everyone connects, ${organizerName} will select the optimal time for the group.</p>
          </div>
          <div class="footer">
            <p>Powered by Syncthesis - Seamless group coordination</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export function getOrganizerReadyToScheduleEmail(
  organizerName: string,
  meetingTitle: string,
  participantCount: number,
  connectedCount: number,
  shareLink: string,
  deadlineInfo?: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; line-height: 1.6; color: #0f172a; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #10b981; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 500; margin: 20px 0; }
          .stats { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🎯 Ready to Schedule Group Meeting!</h1>
          </div>
          <div class="content">
            <p>Hi ${organizerName},</p>
            <p>Great news! ${connectedCount === participantCount ? 'All participants' : 'Enough participants'} have connected their calendars for your group meeting:</p>
            <div class="stats">
              <p style="margin: 5px 0;"><strong>Meeting:</strong> ${meetingTitle}</p>
              <p style="margin: 5px 0;"><strong>Participants Ready:</strong> ${connectedCount}/${participantCount}</p>
              ${deadlineInfo ? `<p style="margin: 5px 0; color: #dc2626;"><strong>Status:</strong> ${deadlineInfo}</p>` : ''}
            </div>
            <p>Our AI has analyzed everyone's calendars and found optimal meeting times. Click below to review and select the best time:</p>
            <div style="text-align: center;">
              <a href="${shareLink}" class="button">Select Meeting Time</a>
            </div>
            <p style="color: #64748b; font-size: 14px;">Once you select a time, all participants will receive calendar invitations automatically.</p>
          </div>
          <div class="footer">
            <p>Powered by Syncthesis - Effortless group scheduling</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export function getDeadlineReminderEmail(
  recipientName: string,
  organizerName: string,
  meetingTitle: string,
  hoursLeft: number,
  shareLink: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; line-height: 1.6; color: #0f172a; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #f59e0b; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 500; margin: 20px 0; }
          .urgency { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">⏰ Deadline Reminder</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <div class="urgency">
              <p style="margin: 0; color: #92400e; font-weight: 600; font-size: 16px;">
                ${hoursLeft} hours left to connect your calendar!
              </p>
            </div>
            <p>You haven't connected your calendar yet for <strong>${organizerName}'s</strong> group meeting: <strong>${meetingTitle}</strong></p>
            <p><strong>What happens if you miss the deadline:</strong></p>
            <ul style="color: #64748b; margin: 15px 0;">
              <li>The meeting will be scheduled without considering your availability</li>
              <li>You might receive a meeting invite for a time that doesn't work for you</li>
              <li>You'll need to request a reschedule if there are conflicts</li>
            </ul>
            <div style="text-align: center;">
              <a href="${shareLink}" class="button">Connect Calendar Now</a>
            </div>
          </div>
          <div class="footer">
            <p>Powered by Syncthesis - Don't miss out on group coordination</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export function getBookingInviteEmail(
  recipientName: string,
  creatorName: string,
  meetingTitle: string,
  shareLink: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; line-height: 1.6; color: #0f172a; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #2563eb; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 500; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Meeting Request</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p><strong>${creatorName}</strong> would like to schedule a meeting with you:</p>
            <p style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <strong>Meeting:</strong> ${meetingTitle}
            </p>
            <p>Click the button below to connect your calendar and select a time that works for both of you:</p>
            <div style="text-align: center;">
              <a href="${shareLink}" class="button">Select Meeting Time</a>
            </div>
            <p style="color: #64748b; font-size: 14px;">This link will let you securely connect your calendar and view available times.</p>
          </div>
          <div class="footer">
            <p>Powered by Syncthesis - No back-and-forth scheduling</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export function getBookingConfirmationEmail(
  recipientName: string,
  meetingTitle: string,
  meetingTime: string,
  meetingDuration: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; line-height: 1.6; color: #0f172a; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; }
          .meeting-details { background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Meeting Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p>Your meeting has been confirmed and added to your calendar.</p>
            <div class="meeting-details">
              <p style="margin: 5px 0;"><strong>Meeting:</strong> ${meetingTitle}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${meetingTime}</p>
              <p style="margin: 5px 0;"><strong>Duration:</strong> ${meetingDuration} minutes</p>
            </div>
            <p>The meeting has been automatically added to both calendars. You'll receive a calendar invitation shortly.</p>
          </div>
          <div class="footer">
            <p>Powered by Syncthesis - No back-and-forth scheduling</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export function getAddedToMeetingEmail(
  recipientName: string,
  organizerName: string,
  meetingTitle: string,
  meetingTime: string,
  meetingDuration: string,
  meetingType: string,
  meetingDetails?: {
    videoLink?: string;
    phoneNumber?: string;
    address?: string;
    notes?: string;
  }
): string {
  const locationInfo = () => {
    if (meetingType === 'video' && meetingDetails?.videoLink) {
      return `<p style="margin: 5px 0;"><strong>Video Link:</strong> <a href="${meetingDetails.videoLink}">${meetingDetails.videoLink}</a></p>`
    }
    if (meetingType === 'phone' && meetingDetails?.phoneNumber) {
      return `<p style="margin: 5px 0;"><strong>Phone:</strong> ${meetingDetails.phoneNumber}</p>`
    }
    if (meetingType === 'in-person' && meetingDetails?.address) {
      return `<p style="margin: 5px 0;"><strong>Location:</strong> ${meetingDetails.address}</p>`
    }
    return ''
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; line-height: 1.6; color: #0f172a; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #7c3aed; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; }
          .meeting-details { background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
          a { color: #2563eb; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">You've been added to a meeting!</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName || 'there'},</p>
            <p><strong>${organizerName}</strong> has added you to a meeting:</p>
            <div class="meeting-details">
              <p style="margin: 5px 0;"><strong>Meeting:</strong> ${meetingTitle}</p>
              <p style="margin: 5px 0;"><strong>Time:</strong> ${meetingTime}</p>
              <p style="margin: 5px 0;"><strong>Duration:</strong> ${meetingDuration} minutes</p>
              <p style="margin: 5px 0;"><strong>Type:</strong> ${meetingType.charAt(0).toUpperCase() + meetingType.slice(1)}</p>
              ${locationInfo()}
              ${meetingDetails?.notes ? `<p style="margin: 15px 0 5px 0;"><strong>Notes:</strong></p><p style="margin: 5px 0; font-style: italic;">${meetingDetails.notes}</p>` : ''}
            </div>
            <p>This meeting has been automatically added to your calendar. You should receive a calendar invitation shortly.</p>
            <p style="color: #64748b; font-size: 14px;">If you need to make changes or can't attend, please contact ${organizerName} directly.</p>
          </div>
          <div class="footer">
            <p>Powered by Syncthesis - Seamless meeting coordination</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export function getFollowUpEmail(
  followUpNumber: number,
  recipientName: string,
  organizerName: string,
  meetingTitle: string,
  personalMessage: string,
  bookingLink: string,
  unsubscribeLink: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; line-height: 1.6; color: #0f172a; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; }
          .meeting-details { background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background: #3b82f6; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 500; margin: 20px 0; }
          .unsubscribe { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">📧 Follow-up: Meeting Request</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            
            ${followUpNumber === 1 ? `
              <p>Just checking if you received my meeting request for <strong>"${meetingTitle}"</strong>.</p>
            ` : followUpNumber === 2 ? `
              <p>I sent a meeting request a few days ago for <strong>"${meetingTitle}"</strong> and wanted to follow up.</p>
              <p>Are you still interested in scheduling this meeting?</p>
            ` : `
              <p>This is my final follow-up regarding the meeting request for <strong>"${meetingTitle}"</strong>.</p>
              <p>If I don't hear back, I'll assume you're not available and will close this request.</p>
            `}
            
            ${personalMessage ? `
              <div class="meeting-details">
                <p style="margin: 0; font-style: italic;">${personalMessage}</p>
              </div>
            ` : ''}
            
            <p>You can connect your calendar and book a time here:</p>
            <div style="text-align: center;">
              <a href="${bookingLink}" class="button">Connect Calendar & Schedule</a>
            </div>
            
            <div class="unsubscribe">
              <p>Not interested? <a href="${unsubscribeLink}" style="color: #64748b;">Click here to stop receiving follow-ups from ${organizerName}</a></p>
            </div>
          </div>
          <div class="footer">
            <p>Powered by Syncthesis - Professional scheduling made simple</p>
          </div>
        </div>
      </body>
    </html>
  `
}

export function getFollowUpSubject(followUpNumber: number, organizerName: string): string {
  const subjects = {
    1: `Quick follow-up: Meeting request from ${organizerName}`,
    2: `Still interested? Meeting request from ${organizerName}`,
    3: `Final reminder: Meeting request from ${organizerName}`
  }
  
  return subjects[followUpNumber as keyof typeof subjects] || subjects[1]
}
