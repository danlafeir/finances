"use server";

import { prisma } from "@/lib/prisma";
import { assessAccount, type AccountCoverage } from "@/lib/coverage";
import { TAX_FORM_TYPES, eligibleAccountsFor } from "@/lib/tax/forms";

export async function getDataCoverage() {
  // The user's calendar day (like currentMonthKey), expressed as a UTC date so
  // the date math in assessAccount stays timezone-free.
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const taxYear = today.getUTCFullYear() - 1;

  const [accounts, txStats, snapshotStats, statementStats, mortgages, taxCounts, taxReturn, taxFiles, policies, undocumented] =
    await Promise.all([
      prisma.account.findMany({ orderBy: { name: "asc" } }),
      prisma.transaction.groupBy({ by: ["accountId"], _count: true, _min: { date: true }, _max: { date: true } }),
      prisma.accountSnapshot.groupBy({ by: ["accountId"], _count: true }),
      prisma.storedFile.groupBy({
        by: ["accountId"],
        where: { kind: "STATEMENT", accountId: { not: null } },
        _count: true,
        _max: { asOfDate: true },
      }),
      prisma.mortgageDetails.findMany({ select: { accountId: true } }),
      prisma.taxRecord.groupBy({ by: ["formType"], where: { taxYear }, _count: true }),
      prisma.taxReturnSummary.findUnique({ where: { taxYear }, select: { id: true } }),
      prisma.storedFile.findMany({ where: { kind: "TAX_FORM", taxYear }, orderBy: { createdAt: "desc" } }),
      prisma.insurancePolicy.count(),
      prisma.insurancePolicy.count({ where: { documents: { none: {} } } }),
    ]);

  const tx = new Map(txStats.map((s) => [s.accountId, s]));
  const snaps = new Map(snapshotStats.map((s) => [s.accountId, s._count]));
  const statements = new Map(statementStats.map((s) => [s.accountId, s]));
  const scheduled = new Set(mortgages.map((m) => m.accountId));

  const rows = accounts.map((account) => {
    const stats = tx.get(account.id);
    const statement = statements.get(account.id);
    const coverage: AccountCoverage = assessAccount(
      {
        id: account.id,
        name: account.name,
        type: account.type,
        snapshotDate: account.snapshotDate,
        snapshotCount: snaps.get(account.id) ?? 0,
        transactionCount: stats?._count ?? 0,
        firstTransactionDate: stats?._min.date ?? null,
        lastTransactionDate: stats?._max.date ?? null,
        statementCount: statement?._count ?? 0,
        lastStatementDate: statement?._max.asOfDate ?? null,
        hasMortgageSchedule: scheduled.has(account.id),
        isPlaidLinked: account.plaidConnectionId !== null,
      },
      today
    );
    return { account, coverage };
  });

  const recordCounts = new Map(taxCounts.map((c) => [c.formType, c._count]));
  const forms = TAX_FORM_TYPES.flatMap(({ value, label }) => {
    const expectedFor = eligibleAccountsFor(value, accounts).map((a) => a.name);
    if (expectedFor.length === 0) return [];
    return [{ formType: value, label, expectedFor, recordCount: recordCounts.get(value) ?? 0 }];
  });

  return {
    today,
    rows,
    tax: { year: taxYear, hasReturn: taxReturn !== null, forms, files: taxFiles },
    insurance: { policies, undocumented },
    hasCreditCard: accounts.some((a) => a.type === "CREDIT_CARD"),
  };
}
