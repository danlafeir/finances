import { Suspense } from "react";
import { MonthPicker } from "@/components/spending/MonthPicker";
import { AccountFilter } from "@/components/spending/AccountFilter";
import { SpendingSection } from "@/components/spending/SpendingSection";
import { IgnoredRecurringList } from "@/components/spending/IgnoredRecurringList";
import {
  getSpendingAccounts,
  getSpendingSummary,
  getRecurringTransactions,
  getAnnualRecurringTransactions,
  getAnomalousDescriptions,
  getMonthlySpendingTrend,
  type RecurringItem,
  type AnnualRecurringItem,
} from "@/actions/spending";
import { getAllVendorLabels } from "@/actions/vendorLabels";
import { getIgnoredRecurringCharges } from "@/actions/recurringOverrides";
import { currentMonthKey } from "@/lib/dates";
import { ACCOUNT_TYPE_COLOR } from "@/lib/accounts";

interface PageProps {
  searchParams: Promise<{ month?: string; account?: string }>;
}

async function fetchSection(currentMonth: string, accountIds: string[]) {
  const [summary, recurring, annual, anomalies, trend] = await Promise.all([
    getSpendingSummary(currentMonth, accountIds),
    getRecurringTransactions(currentMonth, accountIds),
    getAnnualRecurringTransactions(currentMonth, accountIds),
    getAnomalousDescriptions(currentMonth, accountIds),
    getMonthlySpendingTrend(currentMonth, accountIds),
  ]);
  return { summary, recurring, annual, anomalies, trend };
}

type VendorLabelRow = Awaited<ReturnType<typeof getAllVendorLabels>>[number];

function buildSectionItems(
  recurring: RecurringItem[],
  annual: AnnualRecurringItem[],
  labelMap: Map<string, VendorLabelRow>
) {
  const monthlySet = new Set(recurring.map((r) => r.description));
  const annualDeduped = annual.filter((a) => !monthlySet.has(a.description));

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

  const labeledItems = combined
    .filter((c) => labelMap.has(c.description))
    .map((c) => {
      const vendorLabel = labelMap.get(c.description)!;
      return { ...c, label: vendorLabel.label, tag: vendorLabel.tag };
    });
  const unclassifiedItems = combined.filter((c) => !labelMap.has(c.description));

  // Investment contributions are savings, not spending; Credit Card payments
  // are transfers already itemized as purchases on the card itself. Both stay
  // visible in the Recurring Charges table but are split out of "payments."
  const isInvestment = (tag?: string) => tag === "INVESTMENT";
  const isCreditCardPayment = (tag?: string) => tag === "CREDIT_CARD";

  const paymentsItems = recurring.filter(
    (r) =>
      !isInvestment(labelMap.get(r.description)?.tag) &&
      !isCreditCardPayment(labelMap.get(r.description)?.tag)
  );
  const investmentItems = recurring.filter((r) => isInvestment(labelMap.get(r.description)?.tag));

  return {
    labeledItems,
    unclassifiedItems,
    paymentsCents: paymentsItems.reduce((s, r) => s + r.monthlyCostCents, 0),
    paymentsCount: paymentsItems.length,
    investmentsCents: investmentItems.reduce((s, r) => s + r.monthlyCostCents, 0),
    investmentsCount: investmentItems.length,
  };
}

export default async function SpendingPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const currentMonth = sp.month ?? currentMonthKey();
  const accountFilter = sp.account ?? "all";

  const spendingAccounts = await getSpendingAccounts();
  const accountIds =
    accountFilter === "all"
      ? spendingAccounts.map((a) => a.id)
      : spendingAccounts.some((a) => a.id === accountFilter)
      ? [accountFilter]
      : spendingAccounts.map((a) => a.id);

  const checkingIds = accountIds.filter(
    (id) => spendingAccounts.find((a) => a.id === id)?.type === "CHECKING"
  );
  const creditCardIds = accountIds.filter(
    (id) => spendingAccounts.find((a) => a.id === id)?.type === "CREDIT_CARD"
  );

  const [checking, creditCards, vendorLabels, ignoredCharges] = await Promise.all([
    fetchSection(currentMonth, checkingIds),
    fetchSection(currentMonth, creditCardIds),
    getAllVendorLabels(),
    getIgnoredRecurringCharges(),
  ]);

  const labelMap = new Map(vendorLabels.map((v) => [v.description, v]));
  const checkingItems = buildSectionItems(checking.recurring, checking.annual, labelMap);
  const creditCardItems = buildSectionItems(creditCards.recurring, creditCards.annual, labelMap);

  return (
    <div className="p-6 space-y-8 max-w-4xl">
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
          {checkingIds.length > 0 && (
            <SpendingSection
              title="Checking"
              accentColor={ACCOUNT_TYPE_COLOR.CHECKING}
              totalExpenseCents={checking.summary.totalExpenseCents}
              transactionCount={checking.summary.transactionCount}
              trend={checking.trend}
              anomalies={checking.anomalies}
              {...checkingItems}
            />
          )}
          {creditCardIds.length > 0 && (
            <SpendingSection
              title="Credit Cards"
              accentColor={ACCOUNT_TYPE_COLOR.CREDIT_CARD}
              totalExpenseCents={creditCards.summary.totalExpenseCents}
              transactionCount={creditCards.summary.transactionCount}
              trend={creditCards.trend}
              anomalies={creditCards.anomalies}
              {...creditCardItems}
            />
          )}
          <IgnoredRecurringList descriptions={ignoredCharges.map((i) => i.description)} />
        </>
      )}
    </div>
  );
}
