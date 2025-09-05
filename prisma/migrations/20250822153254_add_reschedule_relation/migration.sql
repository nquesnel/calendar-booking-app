-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "bookingCount" INTEGER NOT NULL DEFAULT 0,
    "resetDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "defaultVideoLink" TEXT,
    "defaultPhoneNumber" TEXT,
    "defaultAddress" TEXT,
    "defaultMeetingNotes" TEXT
);

-- CreateTable
CREATE TABLE "CalendarToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" DATETIME,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CalendarToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creatorId" TEXT,
    "recipientId" TEXT,
    "creatorEmail" TEXT NOT NULL,
    "creatorName" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientName" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "shareToken" TEXT NOT NULL,
    "selectedTime" DATETIME,
    "timeZone" TEXT NOT NULL DEFAULT 'UTC',
    "meetingType" TEXT NOT NULL DEFAULT 'video',
    "meetingLink" TEXT,
    "phoneNumber" TEXT,
    "address" TEXT,
    "meetingNotes" TEXT,
    "isGroupMeeting" BOOLEAN NOT NULL DEFAULT false,
    "maxParticipants" INTEGER NOT NULL DEFAULT 2,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringPattern" TEXT,
    "recurringEndDate" DATETIME,
    "parentBookingId" TEXT,
    "googleEventId" TEXT,
    "outlookEventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "score" REAL NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "TimeSuggestion_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "earliestStartTime" TEXT NOT NULL DEFAULT '09:00',
    "latestEndTime" TEXT NOT NULL DEFAULT '17:00',
    "preferredDays" TEXT NOT NULL DEFAULT '1,2,3,4,5',
    "avoidDays" TEXT,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 15,
    "allowBackToBack" BOOLEAN NOT NULL DEFAULT false,
    "lunchBreakStart" TEXT NOT NULL DEFAULT '12:00',
    "lunchBreakEnd" TEXT NOT NULL DEFAULT '13:00',
    "preferredMeetingType" TEXT NOT NULL DEFAULT 'video',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BookingParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingParticipant_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoachingPackage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalSessions" INTEGER NOT NULL,
    "sessionDuration" INTEGER NOT NULL DEFAULT 60,
    "pricePerSession" REAL,
    "totalPrice" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoachingPackage_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoachingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "packageId" TEXT,
    "sessionNumber" INTEGER NOT NULL DEFAULT 1,
    "totalSessions" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "sessionNotes" TEXT,
    "intakeFormData" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoachingSession_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CoachingSession_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "CoachingPackage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroupRescheduleRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalBookingId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "suggestedTimes" TEXT NOT NULL,
    "participantVotes" TEXT,
    "autoConfirmAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GroupRescheduleRequest_originalBookingId_fkey" FOREIGN KEY ("originalBookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Analytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event" TEXT NOT NULL,
    "userId" TEXT,
    "bookingId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarToken_userId_provider_key" ON "CalendarToken"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_shareToken_key" ON "Booking"("shareToken");

-- CreateIndex
CREATE INDEX "TimeSuggestion_bookingId_idx" ON "TimeSuggestion"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingParticipant_bookingId_email_key" ON "BookingParticipant"("bookingId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "CoachingSession_bookingId_key" ON "CoachingSession"("bookingId");

-- CreateIndex
CREATE INDEX "GroupRescheduleRequest_originalBookingId_idx" ON "GroupRescheduleRequest"("originalBookingId");

-- CreateIndex
CREATE INDEX "Analytics_userId_idx" ON "Analytics"("userId");

-- CreateIndex
CREATE INDEX "Analytics_event_idx" ON "Analytics"("event");
