-- CreateTable
CREATE TABLE "StoredFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "relPath" TEXT NOT NULL,
    "asOfDate" DATETIME,
    "taxYear" INTEGER,
    "accountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoredFile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StoredFile_relPath_key" ON "StoredFile"("relPath");

-- CreateIndex
CREATE INDEX "StoredFile_accountId_idx" ON "StoredFile"("accountId");

-- CreateIndex
CREATE INDEX "StoredFile_kind_taxYear_idx" ON "StoredFile"("kind", "taxYear");
