import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthPicker } from "@/components/budgets/MonthPicker";
import { AccountFilter } from "@/components/spending/AccountFilter";
import {
  getSpendingAccounts,
  getSpendingSummary,
  getRecurringTransactions,
  getAnomalousCategories,
} from "@/actions/spending";
import { formatCents } from "@/lib/money";
import { monthKey } from "@/lib/dates";

interface PageProps {
  searchParams: Promise<{ month?: string; account?: string }>;
}

export default async function SpendingPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const currentMonth = sp.month ?? monthKey(new Date());
  const accountFilter = sp.account ?? "all";

  const spendingAccounts = await getSpendingAccounts();
  const accountIds =
    accountFilter === "all"
      ? spendingAccounts.map((a) => a.id)
      : spendingAccounts.some((a) => a.id === accountFilter)
      ? [accountFilter]
      : spendingAccounts.map((a) => a.id);

  const [summary, recurring, anomalies] = await Promise.all([
    getSpendingSummary(currentMonth, accountIds),
    getRecurringTransactions(currentMonth, accountIds),
    getAnomalousCategories(currentMonth, accountIds),
  ]);

  const recurringTotal = recurring.reduce((s, r) => s + r.monthlyCostCents, 0);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Spending</h1>
        <div className="flex items-center gap-3">
          <Suspense>
            <AccountFilter accounts={spendingAccounts} currentAccount={accountFilter} />
          </Suspense>
          <Suspense>
            <MonthPicker currentMonth={currentMonth} />
          </Suspense>
        </div>
      </div>

      {spendingAccounts.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No checking or credit card accounts found. Add one to start tracking spending.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-muted-foreground font-normal">
                  Total Spent This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums">
                  {formatCents(summary.totalExpenseCents)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {summary.transactionCount} transaction
                  {summary.transactionCount !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-muted-foreground font-normal">
                  Recurring / Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums">
                  {formatCents(recurringTotal)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {recurring.length} recurring charge
                  {recurring.length !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recurring Charges</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recurring.length === 0 ? (
                <p className="text-sm text-muted-foreground px-6 py-4">
                  No recurring transactions detected in the last 3 months.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2 px-6 font-medium">Description</th>
                      <th className="text-center py-2 px-3 font-medium">Months Seen</th>
                      <th className="text-right py-2 px-6 font-medium">Monthly Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recurring.map((r) => (
                      <tr key={r.description} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 px-6">{r.description}</td>
                        <td className="py-2 px-3 text-center text-muted-foreground">
                          {r.monthsFound} / 3
                        </td>
                        <td className="py-2 px-6 text-right tabular-nums font-medium">
                          {formatCents(r.monthlyCostCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/30 text-sm font-medium">
                      <td className="py-2 px-6" colSpan={2}>
                        Total recurring
                      </td>
                      <td className="py-2 px-6 text-right tabular-nums">
                        {formatCents(recurringTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Spending Anomalies</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {anomalies.length === 0 ? (
                <p className="text-sm text-muted-foreground px-6 py-4">
                  No anomalies detected — spending looks normal this month.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2 px-6 font-medium">Category</th>
                      <th className="text-right py-2 px-3 font-medium">This Month</th>
                      <th className="text-right py-2 px-3 font-medium">3-mo Avg</th>
                      <th className="text-right py-2 px-6 font-medium">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalies.map((a) => (
                      <tr key={a.categoryId} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 px-6">
                          <span className="mr-2">{a.categoryIcon}</span>
                          {a.categoryName}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {formatCents(a.currentCents)}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                          {formatCents(a.avgCents)}
                        </td>
                        <td className="py-2 px-6 text-right tabular-nums font-medium text-destructive">
                          +{formatCents(a.deltaCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
