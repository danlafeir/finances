"use server";

import { prisma } from "@/lib/prisma";
import { monthKey, monthRange, prevMonthKey } from "@/lib/dates";

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

  const byDesc = new Map<string, { monthKeys: Set<string>; latestCents: number }>();
  for (const row of rows) {
    const key = row.description.trim();
    const mk_ = monthKey(row.date);
    if (!byDesc.has(key)) {
      byDesc.set(key, { monthKeys: new Set(), latestCents: row.amountCents });
    }
    byDesc.get(key)!.monthKeys.add(mk_);
  }

  return Array.from(byDesc.entries())
    .filter(([, v]) => v.monthKeys.size >= 2)
    .map(([description, v]) => ({
      description,
      monthlyCostCents: v.latestCents,
      monthsFound: v.monthKeys.size,
    }))
    .sort((a, b) => b.monthlyCostCents - a.monthlyCostCents);
}

export interface AnomalyItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  currentCents: number;
  avgCents: number;
  deltaCents: number;
  ratio: number;
}

export async function getAnomalousCategories(
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
    categoryId: { not: null as string | null },
  };

  const [baselineRows, currentRows] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { ...sharedWhere, date: { gte: baselineStart, lte: baselineEnd } },
      _sum: { amountCents: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { ...sharedWhere, date: { gte: currentStart, lte: currentEnd } },
      _sum: { amountCents: true },
    }),
  ]);

  const baselineMap = new Map<string, number>();
  for (const row of baselineRows) {
    if (row.categoryId) baselineMap.set(row.categoryId, row._sum.amountCents ?? 0);
  }

  const anomalies: Omit<AnomalyItem, "categoryName" | "categoryIcon">[] = [];
  for (const row of currentRows) {
    if (!row.categoryId) continue;
    const currentCents = row._sum.amountCents ?? 0;
    const baselineTotal = baselineMap.get(row.categoryId) ?? 0;
    if (baselineTotal === 0) continue; // skip new categories — no history to compare
    const avgCents = Math.round(baselineTotal / 3);
    if (currentCents > avgCents * 1.5) {
      anomalies.push({
        categoryId: row.categoryId,
        currentCents,
        avgCents,
        deltaCents: currentCents - avgCents,
        ratio: currentCents / avgCents,
      });
    }
  }

  anomalies.sort((a, b) => b.ratio - a.ratio);

  const categoryIds = anomalies.map((a) => a.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
  });
  const catMap = new Map(categories.map((c) => [c.id, c]));

  return anomalies.map((a) => ({
    ...a,
    categoryName: catMap.get(a.categoryId)?.name ?? "Unknown",
    categoryIcon: catMap.get(a.categoryId)?.icon ?? "📦",
  }));
}
