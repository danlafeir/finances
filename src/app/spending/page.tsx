import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthPicker } from "@/components/spending/MonthPicker";
import { AccountFilter } from "@/components/spending/AccountFilter";
import { MonthlySpendingChart } from "@/components/spending/MonthlySpendingChart";
import { RecurringChargesTable, type LabeledRecurringItem } from "@/components/spending/RecurringChargesTable";
import { UnclassifiedRecurringTable, type UnclassifiedRecurringItem } from "@/components/spending/UnclassifiedRecurringTable";
import {
  getSpendingAccounts,
  getSpendingSummary,
  getRecurringTransactions,
  getAnnualRecurringTransactions,
  getAnomalousDescriptions,
  getMonthlySpendingTrend,
} from "@/actions/spending";
import { getAllVendorLabels } from "@/actions/vendorLabels";
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

  const [summary, recurring, annual, anomalies, trend, vendorLabels] = await Promise.all([
    getSpendingSummary(currentMonth, accountIds),
    getRecurringTransactions(currentMonth, accountIds),
    getAnnualRecurringTransactions(currentMonth, accountIds),
    getAnomalousDescriptions(currentMonth, accountIds),
    getMonthlySpendingTrend(currentMonth, accountIds),
    getAllVendorLabels(),
  ]);

  const recurringTotal = recurring.reduce((s, r) => s + r.monthlyCostCents, 0);

  const monthlySet = new Set(recurring.map((r) => r.description));
  const annualDeduped = annual.filter((a) => !monthlySet.has(a.description));
  const labelMap = new Map(vendorLabels.map((v) => [v.description, v]));

  const combined = [
    ...recurring.map((r) => ({
      description: r.description,
      frequency: "Monthly" as const,
      cents: r.monthlyCostCents,
      lastDate: r.lastDate,
      occurrences: `${r.monthsFound} / 3 months`,
    })),
    ...annualDeduped.map((a) => ({
      description: a.description,
      frequency: "Annual" as const,
      cents: a.amountCents,
      lastDate: a.lastDate,
      occurrences: `${a.yearsFound} years`,
    })),
  ];

  const labeledItems: LabeledRecurringItem[] = combined
    .filter((c) => labelMap.has(c.description))
    .map((c) => {
      const vendorLabel = labelMap.get(c.description)!;
      return { ...c, label: vendorLabel.label, tag: vendorLabel.tag };
    });
  const unclassifiedItems: UnclassifiedRecurringItem[] = combined.filter(
    (c) => !labelMap.has(c.description)
  );

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
                <p className="text-3xl font-bold tabular-nums text-destructive">
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
                <p className="text-3xl font-bold tabular-nums text-destructive">
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
              <CardTitle className="text-base">Spending Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlySpendingChart data={trend} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recurring Charges</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <RecurringChargesTable items={labeledItems} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Noticeably Higher Spending</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {anomalies.length === 0 ? (
                <p className="text-sm text-muted-foreground px-6 py-4">
                  Nothing noticeably higher than usual this month.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left py-2 px-6 font-medium">Description</th>
                      <th className="text-right py-2 px-3 font-medium">This Month</th>
                      <th className="text-right py-2 px-3 font-medium">3-mo Avg</th>
                      <th className="text-right py-2 px-6 font-medium">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalies.map((a) => (
                      <tr key={a.description} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 px-6">{a.description}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-destructive">
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Unclassified Recurring Charges</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <UnclassifiedRecurringTable items={unclassifiedItems} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
