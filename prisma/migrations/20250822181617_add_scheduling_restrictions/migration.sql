-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserPreference" (
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
    "allowSameDayScheduling" BOOLEAN NOT NULL DEFAULT false,
    "minimumNoticeHours" INTEGER NOT NULL DEFAULT 24,
    "preferredMeetingType" TEXT NOT NULL DEFAULT 'video',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserPreference" ("allowBackToBack", "avoidDays", "bufferMinutes", "createdAt", "earliestStartTime", "id", "latestEndTime", "lunchBreakEnd", "lunchBreakStart", "preferredDays", "preferredMeetingType", "updatedAt", "userId") SELECT "allowBackToBack", "avoidDays", "bufferMinutes", "createdAt", "earliestStartTime", "id", "latestEndTime", "lunchBreakEnd", "lunchBreakStart", "preferredDays", "preferredMeetingType", "updatedAt", "userId" FROM "UserPreference";
DROP TABLE "UserPreference";
ALTER TABLE "new_UserPreference" RENAME TO "UserPreference";
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
