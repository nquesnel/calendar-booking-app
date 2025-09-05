-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "avoidDays" TEXT;
ALTER TABLE "Booking" ADD COLUMN "preferredDays" TEXT;
ALTER TABLE "Booking" ADD COLUMN "roughTimeframe" TEXT;
ALTER TABLE "Booking" ADD COLUMN "timeOfDayPref" TEXT;
ALTER TABLE "Booking" ADD COLUMN "timeUrgency" TEXT DEFAULT 'flexible';
