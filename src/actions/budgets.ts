"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/dates";

export async function upsertBudget(categoryId: string, monthKey: string, limitCents: number) {
  const budget = await prisma.budget.upsert({
    where: { categoryId_monthKey: { categoryId, monthKey } },
    update: { limitCents },
    create: { categoryId, monthKey, limitCents },
  });
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return budget;
}

export async function deleteBudget(categoryId: string, monthKey: string) {
  await prisma.budget.deleteMany({ where: { categoryId, monthKey } });
  revalidatePath("/budgets");
}

export async function getBudgetsForMonth(monthKey: string) {
  const { start, end } = monthRange(monthKey);

  const [budgets, categories, spendingRows] = await Promise.all([
    prisma.budget.findMany({
      where: { monthKey },
      include: { category: true },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        type: "EXPENSE",
        transferPairId: null,
        date: { gte: start, lte: end },
        categoryId: { not: null },
      },
      _sum: { amountCents: true },
    }),
  ]);

  const spendingMap = new Map(
    spendingRows.map((r) => [r.categoryId, r._sum.amountCents ?? 0])
  );

  const budgetRows = budgets.map((b) => ({
    ...b,
    spentCents: spendingMap.get(b.categoryId) ?? 0,
  }));

  return { budgetRows, categories, spendingMap };
}
