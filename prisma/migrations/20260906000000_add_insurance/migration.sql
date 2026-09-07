-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "typeOtherLabel" TEXT,
    "nickname" TEXT,
    "insurer" TEXT NOT NULL,
    "policyNumber" TEXT,
    "namedInsureds" TEXT,
    "effectiveDate" DATETIME,
    "expirationDate" DATETIME,
    "premiumCents" INTEGER,
    "premiumFrequency" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InsuranceDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "policyId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InsuranceDocument_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "InsurancePolicy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InsuranceDocumentBlob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "data" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InsuranceDocumentBlob_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "InsuranceDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InsuranceAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "policyId" TEXT NOT NULL,
    "documentId" TEXT,
    "analysisJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InsuranceAnalysis_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "InsurancePolicy" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InsuranceAnalysis_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "InsuranceDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "InsurancePolicy_type_idx" ON "InsurancePolicy"("type");

-- CreateIndex
CREATE INDEX "InsurancePolicy_expirationDate_idx" ON "InsurancePolicy"("expirationDate");

-- CreateIndex
CREATE INDEX "InsuranceDocument_policyId_idx" ON "InsuranceDocument"("policyId");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceDocumentBlob_documentId_key" ON "InsuranceDocumentBlob"("documentId");

-- CreateIndex
CREATE INDEX "InsuranceAnalysis_policyId_createdAt_idx" ON "InsuranceAnalysis"("policyId", "createdAt");
