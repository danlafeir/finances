-- AlterTable
ALTER TABLE "Account" ADD COLUMN "ticker" TEXT;

-- CreateTable
CREATE TABLE "VestingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "shares" REAL NOT NULL,
    "accountId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VestingEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "VestingEvent_accountId_idx" ON "VestingEvent"("accountId");

-- CreateIndex
CREATE INDEX "VestingEvent_date_idx" ON "VestingEvent"("date");
