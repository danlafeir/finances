import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllAccountsWithBalances } from "@/actions/accounts";
import { getPortfolio } from "@/actions/holdings";
import { formatCents } from "@/lib/money";
import { AlertCircle } from "lucide-react";

export async function NetWorthCard() {
  const [accounts, { holdings, totalValueCents, hasStale }] = await Promise.all([
    getAllAccountsWithBalances(),
    getPortfolio(),
  ]);

  const cashAssets = accounts
    .filter((a) => !a.isLiability)
    .reduce((s, a) => s + a.balanceCents, 0);

  const liabilities = accounts
    .filter((a) => a.isLiability)
    .reduce((s, a) => s + a.balanceCents, 0);

  const investmentValue = totalValueCents;
  const netWorth = cashAssets + investmentValue - Math.abs(liabilities);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-muted-foreground font-normal">Net Worth</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold tabular-nums">{formatCents(netWorth)}</p>
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Cash & savings</span>
            <span className="tabular-nums">{formatCents(cashAssets)}</span>
          </div>
          {holdings.length > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Investments</span>
              <span className="tabular-nums">{formatCents(investmentValue)}</span>
            </div>
          )}
          {liabilities !== 0 && (
            <div className="flex justify-between text-destructive/80">
              <span>Liabilities</span>
              <span className="tabular-nums">-{formatCents(Math.abs(liabilities))}</span>
            </div>
          )}
        </div>
        {hasStale && (
          <div className="flex items-center gap-1.5 mt-3 text-xs text-amber-600">
            <AlertCircle className="h-3 w-3" />
            Investment prices may be stale — some values use cost basis
          </div>
        )}
      </CardContent>
    </Card>
  );
}
