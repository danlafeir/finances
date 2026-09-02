import { z } from "zod";
import { TransactionType, TransactionSource } from "@/generated/prisma/enums";

const BaseTransactionSchema = z.object({
  date: z.string(),
  description: z.string().min(1),
  amountCents: z.number().int().positive(),
  accountId: z.string(),
  notes: z.string().optional().nullable(),
  source: z.nativeEnum(TransactionSource).optional().default(TransactionSource.MANUAL),
});

export const CreateTransactionInput = z.discriminatedUnion("formType", [
  BaseTransactionSchema.extend({
    formType: z.literal("INCOME"),
    type: z.literal(TransactionType.INCOME),
  }),
  BaseTransactionSchema.extend({
    formType: z.literal("EXPENSE"),
    type: z.literal(TransactionType.EXPENSE),
  }),
  BaseTransactionSchema.extend({
    formType: z.literal("TRANSFER"),
    destinationAccountId: z.string(),
  }),
]);

export type CreateTransactionInput = z.infer<typeof CreateTransactionInput>;

const TaxRecordBase = z.object({
  taxYear: z.number().int().min(1990).max(2100),
  payerName: z.string().min(1, "Payer/lender name is required"),
  accountId: z.string().min(1, "Please select an account"),
  notes: z.string().optional().nullable(),
});

export const TaxRecordInput = z.discriminatedUnion("formType", [
  TaxRecordBase.extend({
    formType: z.literal("FORM_1099_INT"),
    interestIncomeCents: z.number().int().nonnegative(),
    federalTaxWithheldCents: z.number().int().nonnegative().optional().nullable(),
  }),
  TaxRecordBase.extend({
    formType: z.literal("FORM_1099_DIV_B"),
    ordinaryDividendsCents: z.number().int().nonnegative().optional().nullable(),
    qualifiedDividendsCents: z.number().int().nonnegative().optional().nullable(),
    capitalGainDistributionsCents: z.number().int().nonnegative().optional().nullable(),
    shortTermCapitalGainCents: z.number().int().optional().nullable(),
    longTermCapitalGainCents: z.number().int().optional().nullable(),
    federalTaxWithheldCents: z.number().int().nonnegative().optional().nullable(),
  }).refine(
    (v) =>
      v.ordinaryDividendsCents != null ||
      v.capitalGainDistributionsCents != null ||
      v.shortTermCapitalGainCents != null ||
      v.longTermCapitalGainCents != null,
    { message: "Enter at least one of dividends, capital gain distributions, or short/long-term gain or loss" }
  ),
  TaxRecordBase.extend({
    formType: z.literal("FORM_1098"),
    mortgageInterestPaidCents: z.number().int().nonnegative(),
    outstandingPrincipalCents: z.number().int().nonnegative().optional().nullable(),
  }),
]);

export type TaxRecordInput = z.infer<typeof TaxRecordInput>;

export const TaxReturnSummaryInput = z.object({
  taxYear: z.number().int().min(1990).max(2100),
  filingStatus: z.string().optional().nullable(),
  agiCents: z.number().int(),
  taxableIncomeCents: z.number().int().nonnegative(),
  totalTaxCents: z.number().int().nonnegative(),
  totalPaymentsCents: z.number().int().nonnegative().optional().nullable(),
  refundCents: z.number().int().nonnegative().optional().nullable(),
  amountOwedCents: z.number().int().nonnegative().optional().nullable(),
  taxableInterestCents: z.number().int().nonnegative().optional().nullable(),
  ordinaryDividendsCents: z.number().int().nonnegative().optional().nullable(),
  qualifiedDividendsCents: z.number().int().nonnegative().optional().nullable(),
  capitalGainCents: z.number().int().optional().nullable(),
  mortgageInterestDeductionCents: z.number().int().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type TaxReturnSummaryInput = z.infer<typeof TaxReturnSummaryInput>;
