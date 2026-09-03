"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { TaxRecordInput, TaxReturnSummaryInput } from "@/lib/schemas";
import { TAX_FORM_ELIGIBLE_ACCOUNT_TYPES } from "@/lib/tax/forms";
import type { TaxFormType } from "@/generated/prisma/enums";
import { z } from "zod";

async function assertEligibleAccount(accountId: string, formType: string) {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
  const eligibleTypes = TAX_FORM_ELIGIBLE_ACCOUNT_TYPES[formType] ?? [];
  if (!eligibleTypes.includes(account.type)) {
    throw new Error(`${account.name} is not an eligible account type for this form.`);
  }
}

export async function createTaxRecord(data: TaxRecordInput) {
  const parsed = TaxRecordInput.parse(data);
  await assertEligibleAccount(parsed.accountId, parsed.formType);

  const created = await prisma.taxRecord.create({ data: parsed });

  revalidatePath("/tax");
  revalidatePath(`/accounts/${parsed.accountId}`);

  return created;
}

export async function updateTaxRecord(id: string, data: TaxRecordInput) {
  const parsed = TaxRecordInput.parse(data);
  await assertEligibleAccount(parsed.accountId, parsed.formType);

  const existing = await prisma.taxRecord.findUniqueOrThrow({ where: { id } });
  const updated = await prisma.taxRecord.update({ where: { id }, data: parsed });

  revalidatePath("/tax");
  revalidatePath(`/accounts/${parsed.accountId}`);
  if (existing.accountId && existing.accountId !== parsed.accountId) {
    revalidatePath(`/accounts/${existing.accountId}`);
  }

  return updated;
}

export async function deleteTaxRecord(id: string) {
  const existing = await prisma.taxRecord.findUniqueOrThrow({ where: { id } });
  await prisma.taxRecord.delete({ where: { id } });

  revalidatePath("/tax");
  if (existing.accountId) {
    revalidatePath(`/accounts/${existing.accountId}`);
  }
}

const DuplicateKey = z.object({
  taxYear: z.number().int(),
  formType: z.string(),
  accountId: z.string(),
  payerName: z.string(),
});

export async function findDuplicateTaxRecords(rows: z.infer<typeof DuplicateKey>[]) {
  const keys = z.array(DuplicateKey).parse(rows);
  if (keys.length === 0) return [];

  const candidates = await prisma.taxRecord.findMany({
    where: {
      OR: keys.map((k) => ({
        taxYear: k.taxYear,
        formType: k.formType as TaxFormType,
        accountId: k.accountId,
        payerName: k.payerName,
      })),
    },
    select: { id: true, taxYear: true, formType: true, accountId: true, payerName: true },
  });

  return candidates;
}

export async function commitTaxCsvRows(rows: TaxRecordInput[]) {
  const parsedRows = z.array(TaxRecordInput).parse(rows);
  if (parsedRows.length === 0) return { imported: 0, skipped: 0 };

  const keyOf = (r: { taxYear: number; formType: string; accountId: string; payerName: string }) =>
    `${r.taxYear}|${r.formType}|${r.accountId}|${r.payerName}`;

  const existing = await prisma.taxRecord.findMany({
    where: {
      OR: parsedRows.map((r) => ({
        taxYear: r.taxYear,
        formType: r.formType as TaxFormType,
        accountId: r.accountId,
        payerName: r.payerName,
      })),
    },
    select: { taxYear: true, formType: true, accountId: true, payerName: true },
  });
  const existingKeys = new Set(existing.map((e) => keyOf({ ...e, accountId: e.accountId ?? "" })));

  const deduped = Array.from(new Map(parsedRows.map((r) => [keyOf(r), r])).values());
  const toInsert = deduped.filter((r) => !existingKeys.has(keyOf(r)));
  const skipped = parsedRows.length - toInsert.length;

  if (toInsert.length > 0) {
    await prisma.taxRecord.createMany({ data: toInsert });
  }

  revalidatePath("/tax");
  for (const accountId of new Set(toInsert.map((r) => r.accountId))) {
    revalidatePath(`/accounts/${accountId}`);
  }

  return { imported: toInsert.length, skipped };
}

export async function getTaxRecords(taxYear: number) {
  return prisma.taxRecord.findMany({
    where: { taxYear },
    include: { account: true },
    orderBy: [{ formType: "asc" }, { payerName: "asc" }],
  });
}

export async function getTaxYearsWithData() {
  const [recordYears, returnYears] = await Promise.all([
    prisma.taxRecord.findMany({ distinct: ["taxYear"], select: { taxYear: true } }),
    prisma.taxReturnSummary.findMany({ distinct: ["taxYear"], select: { taxYear: true } }),
  ]);
  const years = new Set([...recordYears.map((r) => r.taxYear), ...returnYears.map((r) => r.taxYear)]);
  return Array.from(years).sort((a, b) => b - a);
}

export async function getTaxSummary(taxYear: number) {
  const result = await prisma.taxRecord.aggregate({
    where: { taxYear },
    _sum: {
      interestIncomeCents: true,
      ordinaryDividendsCents: true,
      qualifiedDividendsCents: true,
      capitalGainDistributionsCents: true,
      shortTermCapitalGainCents: true,
      longTermCapitalGainCents: true,
      mortgageInterestPaidCents: true,
      federalTaxWithheldCents: true,
    },
  });

  const sum = result._sum;
  return {
    interestIncomeCents: sum.interestIncomeCents ?? 0,
    ordinaryDividendsCents: sum.ordinaryDividendsCents ?? 0,
    qualifiedDividendsCents: sum.qualifiedDividendsCents ?? 0,
    capitalGainDistributionsCents: sum.capitalGainDistributionsCents ?? 0,
    shortTermCapitalGainCents: sum.shortTermCapitalGainCents ?? 0,
    longTermCapitalGainCents: sum.longTermCapitalGainCents ?? 0,
    mortgageInterestPaidCents: sum.mortgageInterestPaidCents ?? 0,
    federalTaxWithheldCents: sum.federalTaxWithheldCents ?? 0,
  };
}

// Powers the /tax page's top-level summary cards. Blends TaxRecord (per-account
// documents) with TaxReturnSummary (the filed return) — but per-field, not
// per-source, since a filed return's household totals already include every
// income source, tracked or not: reaching into tracked sums to fill a blank field
// on an existing return risks double-counting an account that's both tracked and
// already folded into the return's total.
export async function getTaxOverview(taxYear: number) {
  const [tracked, returnSummary] = await Promise.all([
    getTaxSummary(taxYear),
    getTaxReturnSummary(taxYear),
  ]);

  const hasReturn = !!returnSummary;

  const taxableInterestCents = hasReturn ? returnSummary!.taxableInterestCents ?? 0 : tracked.interestIncomeCents;
  const ordinaryDividendsCents = hasReturn
    ? returnSummary!.ordinaryDividendsCents ?? 0
    : tracked.ordinaryDividendsCents;
  const qualifiedDividendsCents = hasReturn
    ? returnSummary!.qualifiedDividendsCents ?? 0
    : tracked.qualifiedDividendsCents;

  const trackedCapitalGainsCents =
    tracked.shortTermCapitalGainCents + tracked.longTermCapitalGainCents + tracked.capitalGainDistributionsCents;

  // A filed return can now carry its own Schedule D short/long-term split (lines 7
  // and 15) — when present, that household total is authoritative and tracked
  // per-account sums must NOT also be added, or gains already folded into the
  // return get counted twice. Tracked sums are only used as the split when there's
  // no return, or as a fallback when the return exists but didn't record its own
  // split (e.g. entered before this feature, or the AI tool couldn't find Schedule D).
  const returnHasGainSplit =
    hasReturn &&
    (returnSummary!.shortTermCapitalGainCents != null || returnSummary!.longTermCapitalGainCents != null);

  const shortTermCapitalGainCents = returnHasGainSplit
    ? returnSummary!.shortTermCapitalGainCents ?? 0
    : tracked.shortTermCapitalGainCents;
  const longTermCapitalGainCents = returnHasGainSplit
    ? returnSummary!.longTermCapitalGainCents ?? 0
    : tracked.longTermCapitalGainCents + tracked.capitalGainDistributionsCents;

  // If a return exists, has no ST/LT split, and no tracked account fills the gap
  // either, the return's net capital gain (Line 7) can't be attributed to either
  // bucket — surface it separately rather than silently dropping or misbucketing it.
  const unattributedCapitalGainCents =
    hasReturn && !returnHasGainSplit && trackedCapitalGainsCents === 0 ? returnSummary!.capitalGainCents ?? null : null;

  return {
    hasReturn,
    ordinaryIncomeCents:
      taxableInterestCents + (ordinaryDividendsCents - qualifiedDividendsCents) + shortTermCapitalGainCents,
    preferentialIncomeCents: qualifiedDividendsCents + longTermCapitalGainCents,
    mortgageInterestPaidCents: tracked.mortgageInterestPaidCents,
    paymentsCents: hasReturn ? returnSummary!.totalPaymentsCents ?? 0 : tracked.federalTaxWithheldCents,
    trackedCapitalGainsCents,
    returnCapitalGainCents: returnSummary?.capitalGainCents ?? null,
    unattributedCapitalGainCents,
  };
}

export async function getTaxRecordsForAccount(accountId: string) {
  return prisma.taxRecord.findMany({
    where: { accountId },
    orderBy: [{ taxYear: "desc" }, { formType: "asc" }],
  });
}

export async function getTaxRecord(id: string) {
  return prisma.taxRecord.findUniqueOrThrow({ where: { id } });
}

export async function upsertTaxReturnSummary(data: TaxReturnSummaryInput) {
  const parsed = TaxReturnSummaryInput.parse(data);
  const result = await prisma.taxReturnSummary.upsert({
    where: { taxYear: parsed.taxYear },
    create: parsed,
    update: parsed,
  });

  revalidatePath("/tax");
  revalidatePath(`/tax/return`);

  return result;
}

export async function getTaxReturnSummary(taxYear: number) {
  return prisma.taxReturnSummary.findUnique({ where: { taxYear } });
}

export async function deleteTaxReturnSummary(taxYear: number) {
  await prisma.taxReturnSummary.delete({ where: { taxYear } });
  revalidatePath("/tax");
  revalidatePath(`/tax/return`);
}

export interface TaxReconciliationRow {
  label: string;
  reportedCents: number | null;
  trackedCents: number;
  status: "no-return-data" | "coverage" | "exceeds";
}

// Reported figures are household totals from the filed return; tracked figures only
// cover accounts entered in this app. A gap is expected (untracked accounts, de
// minimis interest with no 1099, etc.) — only "tracked exceeds reported" is a real
// anomaly, since you can't legitimately have more reported to you than the return
// declared.
const RECONCILIATION_TOLERANCE_CENTS = 100;

function reconcileRow(label: string, reportedCents: number | null, trackedCents: number): TaxReconciliationRow {
  if (reportedCents == null) {
    return { label, reportedCents: null, trackedCents, status: "no-return-data" };
  }
  const status: TaxReconciliationRow["status"] =
    trackedCents > reportedCents + RECONCILIATION_TOLERANCE_CENTS ? "exceeds" : "coverage";
  return { label, reportedCents, trackedCents, status };
}

export async function getTaxReconciliation(taxYear: number) {
  const [returnSummary, tracked] = await Promise.all([
    getTaxReturnSummary(taxYear),
    getTaxSummary(taxYear),
  ]);

  if (!returnSummary) return null;

  const rows: TaxReconciliationRow[] = [
    reconcileRow("Taxable Interest", returnSummary.taxableInterestCents, tracked.interestIncomeCents),
    reconcileRow("Ordinary Dividends", returnSummary.ordinaryDividendsCents, tracked.ordinaryDividendsCents),
    reconcileRow(
      "Short-Term Capital Gain/Loss",
      returnSummary.shortTermCapitalGainCents,
      tracked.shortTermCapitalGainCents
    ),
    reconcileRow(
      "Long-Term Capital Gain/Loss",
      returnSummary.longTermCapitalGainCents,
      tracked.longTermCapitalGainCents + tracked.capitalGainDistributionsCents
    ),
    reconcileRow(
      "Mortgage Interest Deduction",
      returnSummary.mortgageInterestDeductionCents,
      tracked.mortgageInterestPaidCents
    ),
  ];

  return { returnSummary, rows };
}
