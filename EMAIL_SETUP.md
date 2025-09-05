# Email Configuration Setup

Your calendar app now automatically sends email invitations when you add people to meetings! Here's how to configure email sending:

## Environment Variables

Add these to your `.env.local` file:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=CalendarSync <your-email@gmail.com>
NEXT_PUBLIC_APP_URL=http://localhost:2769
```

## Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password in `SMTP_PASSWORD`

## Other Email Providers

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
```

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

## What Happens When You Add Invitees

### For Confirmed Meetings (with scheduled time):
- ✅ Sends "You've been added to meeting" email with full details
- ✅ Includes meeting time, location, and notes
- ✅ Professional email template with meeting details

### For Pending Meetings (no time scheduled yet):
- ✅ Sends booking invitation email
- ✅ Includes link for them to connect their calendar
- ✅ Allows them to help select the meeting time

## Testing Email

1. Set up your environment variables
2. Restart the development server: `npm run dev -- --port 2769`
3. Add a test invitee to any meeting
4. Check that emails are being sent (check server logs)

## Email Templates

The app includes professionally designed email templates:
- **Meeting Invitations** - Purple theme for new invitees
- **Booking Requests** - Blue theme for calendar connection
- **Confirmations** - Green theme for confirmed meetings

All emails are mobile-responsive and include your branding.