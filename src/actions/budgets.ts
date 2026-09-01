"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/dates";

export async function upsertBudget(description: string, monthKey: string, limitCents: number) {
  const budget = await prisma.budget.upsert({
    where: { description_monthKey: { description, monthKey } },
    update: { limitCents },
    create: { description, monthKey, limitCents },
  });
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return budget;
}

export async function deleteBudget(description: string, monthKey: string) {
  await prisma.budget.deleteMany({ where: { description, monthKey } });
  revalidatePath("/budgets");
}

export async function getBudgetsForMonth(monthKey: string) {
  const { start, end } = monthRange(monthKey);

  const [budgets, spendingRows] = await Promise.all([
    prisma.budget.findMany({ where: { monthKey }, orderBy: { description: "asc" } }),
    prisma.transaction.groupBy({
      by: ["description"],
      where: {
        type: "EXPENSE",
        transferPairId: null,
        date: { gte: start, lte: end },
      },
      _sum: { amountCents: true },
    }),
  ]);

  const spendingMap = new Map(
    spendingRows.map((r) => [r.description, r._sum.amountCents ?? 0])
  );

  const budgetRows = budgets.map((b) => ({
    ...b,
    spentCents: spendingMap.get(b.description) ?? 0,
  }));

  return { budgetRows, spendingMap };
}
