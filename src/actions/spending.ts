"use server";

import { prisma } from "@/lib/prisma";
import { currentMonthKey, monthKey, monthKeyShortLabel, monthRange, prevMonthKey, shiftMonthKeyYears } from "@/lib/dates";
import { normalizeDescriptionKey } from "@/lib/descriptionKey";

export async function getSpendingAccounts() {
  return prisma.account.findMany({
    where: { type: { in: ["CHECKING", "CREDIT_CARD"] } },
    orderBy: { name: "asc" },
  });
}

export async function getSpendingSummary(
  mk: string,
  accountIds: string[]
): Promise<{ totalExpenseCents: number; transactionCount: number }> {
  if (accountIds.length === 0) return { totalExpenseCents: 0, transactionCount: 0 };
  const { start, end } = monthRange(mk);
  const result = await prisma.transaction.aggregate({
    _sum: { amountCents: true },
    _count: { id: true },
    where: {
      accountId: { in: accountIds },
      type: "EXPENSE",
      transferPairId: null,
      date: { gte: start, lte: end },
    },
  });
  return {
    totalExpenseCents: result._sum.amountCents ?? 0,
    transactionCount: result._count.id,
  };
}

export interface RecurringItem {
  description: string;
  monthlyCostCents: number;
  monthsFound: number;
  lastDate: Date;
}

export async function getRecurringTransactions(
  mk: string,
  accountIds: string[]
): Promise<RecurringItem[]> {
  if (accountIds.length === 0) return [];
  const m0 = prevMonthKey(prevMonthKey(mk));
  const windowStart = monthRange(m0).start;
  const windowEnd = monthRange(mk).end;

  const rows = await prisma.transaction.findMany({
    where: {
      accountId: { in: accountIds },
      type: "EXPENSE",
      transferPairId: null,
      date: { gte: windowStart, lte: windowEnd },
    },
    select: { description: true, amountCents: true, date: true },
    orderBy: { date: "desc" },
  });

  const byDesc = new Map<string, { monthKeys: Set<string>; latestCents: number; latestDate: Date }>();
  for (const row of rows) {
    const key = normalizeDescriptionKey(row.description);
    const mk_ = monthKey(row.date);
    if (!byDesc.has(key)) {
      byDesc.set(key, { monthKeys: new Set(), latestCents: row.amountCents, latestDate: row.date });
    }
    byDesc.get(key)!.monthKeys.add(mk_);
  }

  return Array.from(byDesc.entries())
    .filter(([, v]) => v.monthKeys.size >= 2)
    .map(([description, v]) => ({
      description,
      monthlyCostCents: v.latestCents,
      monthsFound: v.monthKeys.size,
      lastDate: v.latestDate,
    }))
    .sort((a, b) => b.monthlyCostCents - a.monthlyCostCents);
}

export interface AnnualRecurringItem {
  description: string;
  amountCents: number;
  lastDate: Date;
  yearsFound: number;
}

export async function getAnnualRecurringTransactions(
  mk: string,
  accountIds: string[]
): Promise<AnnualRecurringItem[]> {
  if (accountIds.length === 0) return [];
  const windowStart = monthRange(shiftMonthKeyYears(mk, -2)).start;
  const windowEnd = monthRange(mk).end;

  const rows = await prisma.transaction.findMany({
    where: {
      accountId: { in: accountIds },
      type: "EXPENSE",
      transferPairId: null,
      date: { gte: windowStart, lte: windowEnd },
    },
    select: { description: true, amountCents: true, date: true },
    orderBy: { date: "desc" },
  });

  interface MonthOfYearStats {
    years: Set<string>;
    latestDate: Date;
    latestCents: number;
  }
  const byDesc = new Map<string, { byMonthOfYear: Map<string, MonthOfYearStats>; allMonths: Set<string> }>();

  for (const row of rows) {
    const key = normalizeDescriptionKey(row.description);
    const rowMonthKey = monthKey(row.date);
    const monthOfYear = rowMonthKey.slice(5);
    const year = rowMonthKey.slice(0, 4);

    if (!byDesc.has(key)) {
      byDesc.set(key, { byMonthOfYear: new Map(), allMonths: new Set() });
    }
    const entry = byDesc.get(key)!;
    entry.allMonths.add(rowMonthKey);

    if (!entry.byMonthOfYear.has(monthOfYear)) {
      entry.byMonthOfYear.set(monthOfYear, { years: new Set(), latestDate: row.date, latestCents: row.amountCents });
    }
    entry.byMonthOfYear.get(monthOfYear)!.years.add(year);
  }

  const results: AnnualRecurringItem[] = [];
  for (const [description, entry] of byDesc.entries()) {
    let best: MonthOfYearStats | null = null;
    for (const stats of entry.byMonthOfYear.values()) {
      if (!best || stats.years.size > best.years.size) best = stats;
    }
    if (!best || best.years.size < 2) continue;
    if (entry.allMonths.size > best.years.size + 1) continue; // too many distinct months to be an annual charge
    results.push({
      description,
      amountCents: best.latestCents,
      lastDate: best.latestDate,
      yearsFound: best.years.size,
    });
  }

  return results.sort((a, b) => b.amountCents - a.amountCents);
}

export interface MonthlyTotal {
  monthKey: string;
  label: string;
  totalCents: number;
}

export async function getMonthlySpendingTrend(
  mk: string,
  accountIds: string[]
): Promise<MonthlyTotal[]> {
  if (accountIds.length === 0) return [];
  const keys: string[] = [];
  let cursor = mk;
  for (let i = 0; i < 6; i++) {
    keys.unshift(cursor);
    cursor = prevMonthKey(cursor);
  }

  const isCurrentMonth = mk === currentMonthKey();

  return Promise.all(
    keys.map(async (k, i) => {
      const { start, end } = monthRange(k);
      const result = await prisma.transaction.aggregate({
        _sum: { amountCents: true },
        where: { accountId: { in: accountIds }, type: "EXPENSE", transferPairId: null, date: { gte: start, lte: end } },
      });
      const isLast = i === keys.length - 1;
      const label = monthKeyShortLabel(k) + (isLast && isCurrentMonth ? " (MTD)" : "");
      return { monthKey: k, label, totalCents: result._sum.amountCents ?? 0 };
    })
  );
}

export interface AnomalyItem {
  description: string;
  currentCents: number;
  avgCents: number;
  deltaCents: number;
  ratio: number;
}

export async function getAnomalousDescriptions(
  mk: string,
  accountIds: string[]
): Promise<AnomalyItem[]> {
  if (accountIds.length === 0) return [];

  const m2 = prevMonthKey(mk);
  const m1 = prevMonthKey(m2);
  const m0 = prevMonthKey(m1);
  const baselineStart = monthRange(m0).start;
  const baselineEnd = monthRange(m2).end;
  const { start: currentStart, end: currentEnd } = monthRange(mk);

  const sharedWhere = {
    accountId: { in: accountIds },
    type: "EXPENSE" as const,
    transferPairId: null,
  };

  const [baselineRows, currentRows] = await Promise.all([
    prisma.transaction.findMany({
      where: { ...sharedWhere, date: { gte: baselineStart, lte: baselineEnd } },
      select: { description: true, amountCents: true },
    }),
    prisma.transaction.findMany({
      where: { ...sharedWhere, date: { gte: currentStart, lte: currentEnd } },
      select: { description: true, amountCents: true },
    }),
  ]);

  function sumByNormalizedKey(rows: { description: string; amountCents: number }[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const row of rows) {
      const key = normalizeDescriptionKey(row.description);
      map.set(key, (map.get(key) ?? 0) + row.amountCents);
    }
    return map;
  }

  const baselineMap = sumByNormalizedKey(baselineRows);
  const currentMap = sumByNormalizedKey(currentRows);

  const anomalies: AnomalyItem[] = [];
  for (const [description, currentCents] of currentMap) {
    const baselineTotal = baselineMap.get(description) ?? 0;
    if (baselineTotal === 0) continue; // skip descriptions with no prior history
    const avgCents = Math.round(baselineTotal / 3);
    if (currentCents > avgCents * 1.5) {
      anomalies.push({
        description,
        currentCents,
        avgCents,
        deltaCents: currentCents - avgCents,
        ratio: currentCents / avgCents,
      });
    }
  }

  return anomalies.sort((a, b) => b.ratio - a.ratio);
}
