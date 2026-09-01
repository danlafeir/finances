-- CreateTable
CREATE TABLE "MortgageDetails" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "homeValueCents" INTEGER NOT NULL,
    "principalCents" INTEGER NOT NULL,
    "annualRateBps" INTEGER NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "originationDate" DATETIME NOT NULL,
    "monthlyPaymentCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MortgageDetails_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MortgagePayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentNumber" INTEGER NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "paymentCents" INTEGER NOT NULL,
    "principalCents" INTEGER NOT NULL,
    "interestCents" INTEGER NOT NULL,
    "balanceCents" INTEGER NOT NULL,
    "mortgageId" TEXT NOT NULL,
    CONSTRAINT "MortgagePayment_mortgageId_fkey" FOREIGN KEY ("mortgageId") REFERENCES "MortgageDetails" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MortgageDetails_accountId_key" ON "MortgageDetails"("accountId");

-- CreateIndex
CREATE INDEX "MortgagePayment_mortgageId_paymentDate_idx" ON "MortgagePayment"("mortgageId", "paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "MortgagePayment_mortgageId_paymentNumber_key" ON "MortgagePayment"("mortgageId", "paymentNumber");
