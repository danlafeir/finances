import { getPortfolio } from "@/actions/holdings";
import { getAccounts } from "@/actions/accounts";
import { PortfolioTable } from "@/components/investments/PortfolioTable";
import { AllocationChart } from "@/components/investments/AllocationChart";
import { AddHoldingButton } from "@/components/investments/AddHoldingButton";
import { RefreshPricesButton } from "@/components/investments/RefreshPricesButton";
import { formatCents } from "@/lib/money";
import { AlertCircle } from "lucide-react";

export default async function InvestmentsPage() {
  const [{ holdings, totalValueCents, hasStale }, accounts] = await Promise.all([
    getPortfolio(),
    getAccounts(),
  ]);

  const allocationData = holdings.map((h) => ({
    name: h.ticker,
    valueCents: h.currentValueCents ?? h.costBasisCents,
  }));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Investments</h1>
          {holdings.length > 0 && (
            <p className="text-3xl font-bold tabular-nums mt-1">{formatCents(totalValueCents)}</p>
          )}
        </div>
        <div className="flex gap-2">
          <RefreshPricesButton />
          <AddHoldingButton accounts={accounts} />
        </div>
      </div>

      {hasStale && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Some prices are missing or stale. Values shown use cost basis. Click &ldquo;Refresh Prices&rdquo; to update.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <PortfolioTable holdings={holdings} totalValueCents={totalValueCents} accounts={accounts} />
        {holdings.length > 0 && (
          <div>
            <h2 className="text-sm font-medium mb-3">Allocation</h2>
            <AllocationChart data={allocationData} />
          </div>
        )}
      </div>
    </div>
  );
}
