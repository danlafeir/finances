-- Map removed enum values to valid replacements
UPDATE "Account" SET "type" = 'CHECKING' WHERE "type" IN ('SAVINGS', 'CREDIT_CARD', 'OTHER');
UPDATE "Account" SET "type" = 'TAXABLE_BROKERAGE' WHERE "type" = 'BROKERAGE';

-- AlterTable
ALTER TABLE "Account" ADD COLUMN "broker" TEXT;
