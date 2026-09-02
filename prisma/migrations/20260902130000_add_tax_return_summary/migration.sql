-- CreateTable
CREATE TABLE "TaxReturnSummary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taxYear" INTEGER NOT NULL,
    "filingStatus" TEXT,
    "agiCents" INTEGER NOT NULL,
    "taxableIncomeCents" INTEGER NOT NULL,
    "totalTaxCents" INTEGER NOT NULL,
    "totalPaymentsCents" INTEGER,
    "refundCents" INTEGER,
    "amountOwedCents" INTEGER,
    "taxableInterestCents" INTEGER,
    "ordinaryDividendsCents" INTEGER,
    "qualifiedDividendsCents" INTEGER,
    "capitalGainCents" INTEGER,
    "mortgageInterestDeductionCents" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxReturnSummary_taxYear_key" ON "TaxReturnSummary"("taxYear");

