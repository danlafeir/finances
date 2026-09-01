-- AlterTable: rename originationDate -> firstPaymentDate
ALTER TABLE "MortgageDetails" RENAME COLUMN "originationDate" TO "firstPaymentDate";
