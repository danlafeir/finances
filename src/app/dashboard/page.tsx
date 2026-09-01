import { Suspense } from "react";
import { NetWorthCard } from "@/components/dashboard/NetWorthCard";
import { BudgetStatusBars } from "@/components/dashboard/BudgetStatusBars";

export default async function DashboardPage() {
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
      </div>
    </div>
  );
}
