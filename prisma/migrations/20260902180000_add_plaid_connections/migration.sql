-- CreateTable
CREATE TABLE "PlaidConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "accessTokenCiphertext" TEXT NOT NULL,
    "institutionId" TEXT,
    "institutionName" TEXT,
    "ownerName" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "cursor" TEXT,
    "lastSyncedAt" DATETIME,
    "lastSyncError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "broker" TEXT,
    "ticker" TEXT,
    "isLiability" BOOLEAN NOT NULL DEFAULT false,
    "snapshotBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "snapshotDate" DATETIME,
    "interestRateBps" INTEGER,
    "contributionCents" INTEGER,
    "contributionFrequency" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "color" TEXT,
    "plaidConnectionId" TEXT,
    "plaidAccountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_plaidConnectionId_fkey" FOREIGN KEY ("plaidConnectionId") REFERENCES "PlaidConnection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Account" ("broker", "color", "contributionCents", "contributionFrequency", "createdAt", "currency", "id", "interestRateBps", "isLiability", "name", "plaidAccountId", "snapshotBalanceCents", "snapshotDate", "ticker", "type", "updatedAt") SELECT "broker", "color", "contributionCents", "contributionFrequency", "createdAt", "currency", "id", "interestRateBps", "isLiability", "name", "plaidAccountId", "snapshotBalanceCents", "snapshotDate", "ticker", "type", "updatedAt" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE UNIQUE INDEX "Account_plaidAccountId_key" ON "Account"("plaidAccountId");
CREATE TABLE "new_Holding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticker" TEXT NOT NULL,
    "name" TEXT,
    "shares" REAL NOT NULL,
    "costBasisCents" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "plaidSecurityId" TEXT,
    "accountId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Holding_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Holding" ("accountId", "costBasisCents", "createdAt", "id", "name", "shares", "ticker", "updatedAt") SELECT "accountId", "costBasisCents", "createdAt", "id", "name", "shares", "ticker", "updatedAt" FROM "Holding";
DROP TABLE "Holding";
ALTER TABLE "new_Holding" RENAME TO "Holding";
CREATE INDEX "Holding_ticker_idx" ON "Holding"("ticker");
CREATE UNIQUE INDEX "Holding_accountId_ticker_key" ON "Holding"("accountId", "ticker");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PlaidConnection_itemId_key" ON "PlaidConnection"("itemId");
