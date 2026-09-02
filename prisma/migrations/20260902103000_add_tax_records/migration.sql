-- CreateTable
CREATE TABLE "TaxRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taxYear" INTEGER NOT NULL,
    "formType" TEXT NOT NULL,
    "payerName" TEXT NOT NULL,
    "accountId" TEXT,
    "interestIncomeCents" INTEGER,
    "ordinaryDividendsCents" INTEGER,
    "qualifiedDividendsCents" INTEGER,
    "capitalGainDistributionsCents" INTEGER,
    "shortTermCapitalGainCents" INTEGER,
    "longTermCapitalGainCents" INTEGER,
    "mortgageInterestPaidCents" INTEGER,
    "outstandingPrincipalCents" INTEGER,
    "federalTaxWithheldCents" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaxRecord_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TaxRecord_taxYear_idx" ON "TaxRecord"("taxYear");

-- CreateIndex
CREATE INDEX "TaxRecord_accountId_idx" ON "TaxRecord"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxRecord_taxYear_formType_accountId_payerName_key" ON "TaxRecord"("taxYear", "formType", "accountId", "payerName");

