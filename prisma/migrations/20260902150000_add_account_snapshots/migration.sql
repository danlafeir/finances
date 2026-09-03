-- CreateTable
CREATE TABLE "AccountSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "balanceCents" INTEGER NOT NULL,
    "asOfDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AccountSnapshot_accountId_asOfDate_idx" ON "AccountSnapshot"("accountId", "asOfDate");
