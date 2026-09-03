import Link from "next/link";
import { getPortfolio } from "@/actions/holdings";
import { getAccounts, getAllAccountsWithBalances, getInvestmentGrowthHistory } from "@/actions/accounts";
import { PortfolioTable } from "@/components/investments/PortfolioTable";
import { AllocationChart } from "@/components/investments/AllocationChart";
import { AccountGrowthChart } from "@/components/investments/AccountGrowthChart";
import { AddHoldingButton } from "@/components/investments/AddHoldingButton";
import { RefreshPricesButton } from "@/components/investments/RefreshPricesButton";
import { formatCents } from "@/lib/money";
import { ACCOUNT_TYPE_LABEL, INVESTMENT_GROWTH_TYPES } from "@/lib/accounts";
import { AlertCircle } from "lucide-react";

export default async function InvestmentsPage() {
  const [{ holdings, totalValueCents, hasStale }, accounts, allAccountsWithBalances, growthHistory] =
    await Promise.all([
      getPortfolio(),
      getAccounts(),
      getAllAccountsWithBalances(),
      getInvestmentGrowthHistory(),
    ]);

  const allocationData = holdings.map((h) => ({
    name: h.ticker,
    valueCents: h.currentValueCents ?? h.costBasisCents,
  }));

  const growthAccounts = allAccountsWithBalances.filter((a) => INVESTMENT_GROWTH_TYPES.has(a.type));
  const growthTotalCents = growthAccounts.reduce((sum, a) => sum + a.balanceCents, 0);

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
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

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-medium">Brokerage &amp; HSA Accounts</h2>
          {growthAccounts.length > 0 && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {formatCents(growthTotalCents)} total
            </span>
          )}
        </div>

        {growthAccounts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No brokerage or HSA accounts yet.{" "}
            <Link href="/accounts/new" className="underline">
              Add one
            </Link>{" "}
            to see it here.
          </p>
        ) : (
          <div className="space-y-4">
            <AccountGrowthChart
              series={growthHistory.map((h) => ({ id: h.id, name: h.name, points: h.points }))}
            />
            <div className="space-y-1">
              {growthAccounts.map((a) => (
                <Link
                  key={a.id}
                  href={`/accounts/${a.id}`}
                  className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {a.color && (
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                    )}
                    <span className="font-medium">{a.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {ACCOUNT_TYPE_LABEL[a.type] ?? a.type}
                    </span>
                  </div>
                  <span className="font-medium tabular-nums">{formatCents(a.balanceCents)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {hasStale && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
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
