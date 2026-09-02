import { Suspense } from "react";
import { NetWorthCard } from "@/components/dashboard/NetWorthCard";
import { AccessibleInvestmentsCard, RestrictedInvestmentsCard, LiquidCashCard } from "@/components/dashboard/SummaryStatCard";

const CardSkeleton = () => <div className="h-32 rounded-lg bg-muted animate-pulse" />;

export default async function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Suspense fallback={<CardSkeleton />}>
          <NetWorthCard />
        </Suspense>

        <Suspense fallback={<CardSkeleton />}>
          <LiquidCashCard />
        </Suspense>

        <Suspense fallback={<CardSkeleton />}>
          <AccessibleInvestmentsCard />
        </Suspense>

        <Suspense fallback={<CardSkeleton />}>
          <RestrictedInvestmentsCard />
        </Suspense>
      </div>
    </div>
  );
}
