-- CreateTable
CREATE TABLE "IgnoredRecurringCharge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "IgnoredRecurringCharge_description_key" ON "IgnoredRecurringCharge"("description");
