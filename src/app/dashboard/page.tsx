import { Suspense } from "react";
import { NetWorthCard } from "@/components/dashboard/NetWorthCard";
import { BudgetStatusBars } from "@/components/dashboard/BudgetStatusBars";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { SpendingByCategory } from "@/components/dashboard/SpendingByCategory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { monthRange, monthKey } from "@/lib/dates";

async function getSpendingData() {
  const { start, end } = monthRange(monthKey(new Date()));
  const rows = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      type: "EXPENSE",
      transferPairId: null,
      date: { gte: start, lte: end },
      categoryId: { not: null },
    },
    _sum: { amountCents: true },
    orderBy: { _sum: { amountCents: "desc" } },
  });

  const categoryIds = rows.map((r) => r.categoryId!).filter(Boolean);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
  });

  const catMap = new Map(categories.map((c) => [c.id, c]));

  return rows
    .map((r) => {
      const cat = catMap.get(r.categoryId!);
      return {
        name: cat?.name ?? "Other",
        icon: cat?.icon ?? "📦",
        valueCents: r._sum.amountCents ?? 0,
      };
    })
    .filter((d) => d.valueCents > 0);
}

export default async function DashboardPage() {
  const spendingData = await getSpendingData();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Suspense fallback={<div className="h-32 rounded-lg bg-muted animate-pulse" />}>
          <NetWorthCard />
        </Suspense>

        <Suspense fallback={<div className="h-32 rounded-lg bg-muted animate-pulse" />}>
          <BudgetStatusBars />
        </Suspense>

        {spendingData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Spending This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <SpendingByCategory data={spendingData} />
            </CardContent>
          </Card>
        )}
      </div>

      <Suspense fallback={<div className="h-48 rounded-lg bg-muted animate-pulse" />}>
        <RecentTransactions />
      </Suspense>
    </div>
  );
}
