import { Suspense } from "react";
import { getBudgetsForMonth } from "@/actions/budgets";
import { getRecurringTransactions, getSpendingAccounts } from "@/actions/spending";
import { MonthPicker } from "@/components/budgets/MonthPicker";
import { BudgetRow } from "@/components/budgets/BudgetRow";
import { monthKey } from "@/lib/dates";

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function BudgetsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const currentMonth = sp.month ?? monthKey(new Date());

  const spendingAccounts = await getSpendingAccounts();
  const accountIds = spendingAccounts.map((a) => a.id);

  const [{ budgetRows }, recurring] = await Promise.all([
    getBudgetsForMonth(currentMonth),
    getRecurringTransactions(currentMonth, accountIds),
  ]);

  const budgetedDescriptions = new Set(budgetRows.map((b) => b.description));
  const unbudgetedRecurring = recurring.filter((r) => !budgetedDescriptions.has(r.description));

  const totalLimit = budgetRows.reduce((s, b) => s + b.limitCents, 0);
  const totalSpent = budgetRows.reduce((s, b) => s + b.spentCents, 0);

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Budgets</h1>
        <Suspense>
          <MonthPicker currentMonth={currentMonth} />
        </Suspense>
      </div>

      {budgetRows.length > 0 && (
        <div className="text-sm text-muted-foreground mb-4">
          Spent <span className="font-medium text-foreground">${(totalSpent / 100).toFixed(2)}</span> of{" "}
          <span className="font-medium text-foreground">${(totalLimit / 100).toFixed(2)}</span> budgeted this month
        </div>
      )}

      <div className="space-y-0 mb-6">
        <h2 className="text-sm font-medium text-muted-foreground mb-1">Budgeted</h2>
        {budgetRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No budgets set yet. Set a limit on a recurring charge below.
          </p>
        ) : (
          budgetRows.map((b) => (
            <BudgetRow
              key={b.description}
              description={b.description}
              monthKey={currentMonth}
              limitCents={b.limitCents}
              spentCents={b.spentCents}
            />
          ))
        )}
      </div>

      {unbudgetedRecurring.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-1">Recurring — No Budget Set</h2>
          {unbudgetedRecurring.map((r) => (
            <BudgetRow
              key={r.description}
              description={r.description}
              monthKey={currentMonth}
              limitCents={null}
              spentCents={r.monthlyCostCents}
            />
          ))}
        </div>
      )}
    </div>
  );
}
