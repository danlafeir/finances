import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlySpendingChart } from "@/components/spending/MonthlySpendingChart";
import { RecurringChargesTable, type LabeledRecurringItem } from "@/components/spending/RecurringChargesTable";
import { UnclassifiedRecurringTable, type UnclassifiedRecurringItem } from "@/components/spending/UnclassifiedRecurringTable";
import { AnomaliesTable } from "@/components/spending/AnomaliesTable";
import { formatCents } from "@/lib/money";
import type { AnomalyItem, MonthlyTotal } from "@/actions/spending";

interface SpendingSectionProps {
  title: string;
  accentColor?: string;
  totalExpenseCents: number;
  transactionCount: number;
  paymentsCents: number;
  paymentsCount: number;
  investmentsCents: number;
  investmentsCount: number;
  trend: MonthlyTotal[];
  labeledItems: LabeledRecurringItem[];
  unclassifiedItems: UnclassifiedRecurringItem[];
  anomalies: AnomalyItem[];
}

export function SpendingSection({
  title,
  accentColor,
  totalExpenseCents,
  transactionCount,
  paymentsCents,
  paymentsCount,
  investmentsCents,
  investmentsCount,
  trend,
  labeledItems,
  unclassifiedItems,
  anomalies,
}: SpendingSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        {accentColor && (
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
        )}
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground font-normal">
              Total Spent This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-destructive">
              {formatCents(totalExpenseCents)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {transactionCount} transaction{transactionCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground font-normal">
              Recurring Payments / Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-destructive">
              {formatCents(paymentsCents)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {paymentsCount} recurring charge{paymentsCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground font-normal">
              Recurring Investments / Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{formatCents(investmentsCents)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {investmentsCount} recurring contribution{investmentsCount !== 1 ? "s" : ""}
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
          <AnomaliesTable items={anomalies} />
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
    </section>
  );
}
