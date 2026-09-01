import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getBudgetsForMonth } from "@/actions/budgets";
import { formatCents } from "@/lib/money";
import { monthKey } from "@/lib/dates";
import Link from "next/link";

export async function BudgetStatusBars() {
  const currentMonth = monthKey(new Date());
  const { budgetRows } = await getBudgetsForMonth(currentMonth);

  if (budgetRows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Budgets</CardTitle>
          <Link href="/budgets" className="text-xs text-muted-foreground hover:underline">
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {budgetRows.slice(0, 6).map((b) => {
          const pct = Math.min(Math.round((b.spentCents / b.limitCents) * 100), 100);
          const over = b.spentCents > b.limitCents;
          return (
            <div key={b.description}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium truncate mr-2">{b.description}</span>
                <span className={`shrink-0 ${over ? "text-destructive" : "text-muted-foreground"}`}>
                  {formatCents(b.spentCents)} / {formatCents(b.limitCents)}
                </span>
              </div>
              <Progress
                value={pct}
                className={`h-1.5 ${over ? "[&>div]:bg-destructive" : ""}`}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
