import { Suspense } from "react";
import { getBudgetsForMonth } from "@/actions/budgets";
import { MonthPicker } from "@/components/budgets/MonthPicker";
import { BudgetRow } from "@/components/budgets/BudgetRow";
import { monthKey } from "@/lib/dates";

interface PageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function BudgetsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const currentMonth = sp.month ?? monthKey(new Date());

  const { budgetRows, categories, spendingMap } = await getBudgetsForMonth(currentMonth);

  const budgetedCategoryIds = new Set(budgetRows.map((b) => b.categoryId));
  const unbudgetedCategories = categories.filter((c) => !budgetedCategoryIds.has(c.id));

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
        <h2 className="text-sm font-medium text-muted-foreground mb-1">Budgeted Categories</h2>
        {budgetRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No budgets set yet. Add a budget to a category below.
          </p>
        ) : (
          budgetRows.map((b) => (
            <BudgetRow
              key={b.categoryId}
              category={b.category}
              monthKey={currentMonth}
              limitCents={b.limitCents}
              spentCents={b.spentCents}
            />
          ))
        )}
      </div>

      {unbudgetedCategories.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-1">Unbudgeted Categories</h2>
          {unbudgetedCategories.map((cat) => (
            <BudgetRow
              key={cat.id}
              category={cat}
              monthKey={currentMonth}
              limitCents={null}
              spentCents={spendingMap.get(cat.id) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
