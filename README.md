# CalendarSync - Viral Calendar Booking Tool

A modern, mobile-first calendar booking application that eliminates the back-and-forth of scheduling meetings. Connect calendars in 30 seconds and let AI find the perfect meeting time.

## Features

✅ **No Account Required** - Recipients can book without signing up
✅ **30-Second Calendar Connection** - Quick OAuth with Google & Outlook
✅ **AI-Powered Scheduling** - Smart algorithm finds optimal meeting times
✅ **Mobile-First Design** - Works perfectly on all devices
✅ **Automatic Calendar Sync** - Meetings added to both calendars instantly
✅ **Professional UI** - Clean, minimal design inspired by Calendly/Linear/Stripe

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Database**: SQLite with Prisma ORM
- **Calendar APIs**: Google Calendar API, Microsoft Graph API
- **Email**: Nodemailer with SMTP
- **Authentication**: OAuth 2.0 for calendar connections

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `NEXT_PUBLIC_APP_URL` - Your app URL (http://localhost:3000 for development)
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `MICROSOFT_CLIENT_ID` & `MICROSOFT_CLIENT_SECRET` - From Azure Portal
- `SMTP_*` - Email configuration (Gmail, SendGrid, etc.)

### 3. Set Up OAuth Credentials

#### Google Calendar API:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`

#### Microsoft Outlook API:
1. Go to [Azure Portal](https://portal.azure.com)
2. Register a new application
3. Add API permissions for Calendars.Read and Calendars.ReadWrite
4. Add redirect URI: `http://localhost:3000/api/auth/microsoft/callback`

### 4. Initialize Database

```bash
npx prisma generate
npx prisma db push
```

### 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Usage Flow

1. **Create Booking**: Go to `/create` and fill in meeting details
2. **Share Link**: Copy the generated link and send to your meeting partner
3. **Connect Calendar**: Recipient clicks link and connects their calendar
4. **Select Time**: AI suggests 3 optimal times based on both calendars
5. **Confirm**: Meeting is automatically added to both calendars

## Pricing Tiers

- **Free**: 5 bookings/month
- **Pro ($15/month)**: Unlimited bookings, custom branding
- **Team ($49/month)**: Multi-person scheduling, API access

## Project Structure

```
├── app/
│   ├── api/           # API routes
│   ├── book/          # Booking flow pages
│   ├── create/        # Create booking page
│   ├── dashboard/     # Analytics dashboard
│   └── page.tsx       # Landing page
├── lib/
│   ├── calendar/      # Calendar integration utilities
│   ├── db.ts          # Database connection
│   ├── email.ts       # Email utilities
│   └── utils.ts       # Helper functions
├── prisma/
│   └── schema.prisma  # Database schema
└── public/            # Static assets
```

## Mobile Optimization

- Touch-friendly buttons (44px minimum tap targets)
- Thumb-friendly navigation
- Optimized forms with proper input types
- Fast loading on mobile connections
- No horizontal scrolling
- 16px minimum text size

## Production Deployment

1. Set production environment variables
2. Build the application: `npm run build`
3. Start production server: `npm start`

## License

MIT
