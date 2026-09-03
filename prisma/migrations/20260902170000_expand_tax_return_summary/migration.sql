-- AlterTable
ALTER TABLE "TaxReturnSummary" ADD COLUMN "shortTermCapitalGainCents" INTEGER;
ALTER TABLE "TaxReturnSummary" ADD COLUMN "longTermCapitalGainCents" INTEGER;
ALTER TABLE "TaxReturnSummary" ADD COLUMN "capitalLossCarryoverCents" INTEGER;
ALTER TABLE "TaxReturnSummary" ADD COLUMN "deductionCents" INTEGER;
ALTER TABLE "TaxReturnSummary" ADD COLUMN "itemizedDeductionsCents" INTEGER;
ALTER TABLE "TaxReturnSummary" ADD COLUMN "saltDeductionCents" INTEGER;
ALTER TABLE "TaxReturnSummary" ADD COLUMN "qbiDeductionCents" INTEGER;
ALTER TABLE "TaxReturnSummary" ADD COLUMN "iraDeductionCents" INTEGER;
ALTER TABLE "TaxReturnSummary" ADD COLUMN "hsaDeductionCents" INTEGER;
ALTER TABLE "TaxReturnSummary" ADD COLUMN "amtiCents" INTEGER;
ALTER TABLE "TaxReturnSummary" ADD COLUMN "tentativeMinimumTaxCents" INTEGER;
ALTER TABLE "TaxReturnSummary" ADD COLUMN "amtCents" INTEGER;
ALTER TABLE "TaxReturnSummary" ADD COLUMN "additionalMedicareTaxCents" INTEGER;
ALTER TABLE "TaxReturnSummary" ADD COLUMN "netInvestmentIncomeTaxCents" INTEGER;
ALTER TABLE "TaxReturnSummary" ADD COLUMN "estimatedTaxPenaltyCents" INTEGER;
