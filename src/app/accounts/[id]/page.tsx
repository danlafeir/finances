import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAccountWithBalance } from "@/actions/accounts";
import { prisma } from "@/lib/prisma";
import { Pencil, Upload, Plus } from "lucide-react";
import { DeleteAccountButton } from "@/components/accounts/DeleteAccountButton";
import { AddSnapshotButton } from "@/components/accounts/AddSnapshotButton";
import { DeleteTaxRecordButton } from "@/components/tax/DeleteTaxRecordButton";
import { cn } from "@/lib/utils";
import { ACCOUNT_TYPE_LABEL } from "@/lib/accounts";
import { TAX_ELIGIBLE_ACCOUNT_TYPES, TAX_FORM_LABEL } from "@/lib/tax/forms";
import { getMortgageDetails } from "@/actions/mortgage";
import { lookupTickerPrice } from "@/actions/accounts";
import { getTaxRecordsForAccount } from "@/actions/tax";
import { formatCents } from "@/lib/money";
import {
  getScheduleSummary,
  generateSyntheticSchedule,
  type ScheduleRow,
} from "@/lib/mortgage";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let account;
  try {
    account = await getAccountWithBalance(id);
  } catch {
    notFound();
  }

  const isMortgage = account.type === "MORTGAGE";
  const isStockPlan = account.type === "STOCK_PLAN";
  const mortgage = isMortgage ? await getMortgageDetails(id) : null;

  const vestingEvents = isStockPlan
    ? await prisma.vestingEvent.findMany({
        where: { accountId: id },
        orderBy: { date: "asc" },
      })
    : [];
  const stockPriceCents = isStockPlan && account.ticker
    ? await lookupTickerPrice(account.ticker)
    : null;

  const now = new Date();
  const futureVestingEvents = vestingEvents.filter((e) => new Date(e.date) > now);
  const nextVest = futureVestingEvents[0] ?? null;
  const nextVestValueCents = nextVest && stockPriceCents
    ? Math.round(nextVest.shares * stockPriceCents)
    : null;
  const totalFutureVestValueCents = stockPriceCents
    ? futureVestingEvents.reduce((sum, e) => sum + Math.round(e.shares * stockPriceCents), 0)
    : null;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const transactions = !isMortgage
    ? await prisma.transaction.findMany({
        where: { accountId: id, date: { gte: sixMonthsAgo } },
        orderBy: { date: "desc" },
      })
    : [];

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  let scheduleRows: ScheduleRow[] = [];
  if (mortgage) {
    const stored: ScheduleRow[] = mortgage.payments.map((p) => ({
      paymentNumber: p.paymentNumber,
      paymentDate: new Date(p.paymentDate).toISOString().slice(0, 10),
      paymentCents: p.paymentCents,
      principalCents: p.principalCents,
      interestCents: p.interestCents,
      balanceCents: p.balanceCents,
    }));
    scheduleRows =
      stored.length > 0
        ? stored
        : generateSyntheticSchedule(
            mortgage.principalCents,
            mortgage.annualRateBps,
            mortgage.monthlyPaymentCents,
            new Date(mortgage.firstPaymentDate).toISOString().slice(0, 10),
            mortgage.termMonths
          );
  }

  const { currentBalanceCents, nextPayment, paidOffPercent } = mortgage
    ? getScheduleSummary(scheduleRows, mortgage.principalCents)
    : { currentBalanceCents: 0, nextPayment: null, paidOffPercent: 0 };

  const isTaxEligible = TAX_ELIGIBLE_ACCOUNT_TYPES.has(account.type);
  const taxRecords = isTaxEligible ? await getTaxRecordsForAccount(id) : [];

  const scheduleInterestByYear: Record<number, number> = {};
  if (isMortgage) {
    for (const row of scheduleRows) {
      const year = new Date(row.paymentDate).getUTCFullYear();
      scheduleInterestByYear[year] = (scheduleInterestByYear[year] ?? 0) + row.interestCents;
    }
  }

  function taxRecordAmountCents(r: (typeof taxRecords)[number]): number {
    switch (r.formType) {
      case "FORM_1099_INT":
        return r.interestIncomeCents ?? 0;
      case "FORM_1099_DIV_B":
        // Ordinary dividends already includes qualified dividends as a subset — sum
        // with capital gain distributions and short/long-term gains so a sales-only
        // year (no dividends) doesn't display as $0.00.
        return (
          (r.ordinaryDividendsCents ?? 0) +
          (r.capitalGainDistributionsCents ?? 0) +
          (r.shortTermCapitalGainCents ?? 0) +
          (r.longTermCapitalGainCents ?? 0)
        );
      case "FORM_1098":
        return r.mortgageInterestPaidCents ?? 0;
      default:
        return 0;
    }
  }

  return (
    <div className="p-6 w-full max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {account.color && (
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: account.color }} />
            )}
            <h1 className="text-2xl font-semibold">{account.name}</h1>
            <Badge variant="secondary">{ACCOUNT_TYPE_LABEL[account.type] ?? account.type}</Badge>
          </div>
          <p className="text-3xl font-bold tabular-nums">{formatCents(account.balanceCents)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            As of{" "}
            {account.snapshotDate
              ? new Date(account.snapshotDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
              : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          {!isMortgage && <AddSnapshotButton account={account} />}
          <Link
            href={`/accounts/${id}/edit`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Link>
          <DeleteAccountButton id={id} name={account.name} />
        </div>
      </div>

      {isStockPlan && (
        <div className="mb-6 border rounded-lg p-4 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground">Vesting Schedule</h2>
          {nextVest ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Next Vesting Event</p>
                <p className="text-lg font-semibold">
                  {new Date(nextVest.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}
                  {" — "}
                  {nextVest.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })} shares
                </p>
                {nextVestValueCents !== null && (
                  <p className="text-2xl font-bold tabular-nums text-amber-500">
                    {formatCents(nextVestValueCents)}
                  </p>
                )}
                {stockPriceCents && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    at {formatCents(stockPriceCents)}/share ({account.ticker})
                  </p>
                )}
              </div>
              {totalFutureVestValueCents !== null && futureVestingEvents.length > 1 && (
                <p className="text-sm text-muted-foreground tabular-nums">
                  Total possible vesting ({futureVestingEvents.length} events):{" "}
                  <span className="font-medium">{formatCents(totalFutureVestValueCents)}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No future vesting events.</p>
          )}
        </div>
      )}

      {mortgage && (
        <div className="mb-6 border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Mortgage Summary</h2>
            <p className="text-xs text-muted-foreground">
              As of {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Home Value</p>
              <p className="font-semibold tabular-nums">{formatCents(mortgage.homeValueCents)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Remaining Balance</p>
              <p className="font-semibold tabular-nums">{formatCents(currentBalanceCents)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Equity</p>
              <p
                className={`font-semibold tabular-nums ${
                  mortgage.homeValueCents - currentBalanceCents >= 0
                    ? "text-primary"
                    : "text-destructive"
                }`}
              >
                {formatCents(mortgage.homeValueCents - currentBalanceCents)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Next Payment Due</p>
              <p className="font-semibold tabular-nums">
                {formatCents(nextPayment?.paymentCents ?? mortgage.monthlyPaymentCents)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Rate</p>
              <p className="font-semibold">{(mortgage.annualRateBps / 100).toFixed(3)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Term</p>
              <p className="font-semibold">{(mortgage.termMonths / 12).toFixed(2)} years</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Paid Off</p>
              <p className="font-semibold">{paidOffPercent}%</p>
            </div>
            {nextPayment && (
              <div>
                <p className="text-muted-foreground text-xs">Next Payment Date</p>
                <p className="font-semibold">
                  {new Date(nextPayment.paymentDate).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </p>
              </div>
            )}
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Original loan: {formatCents(mortgage.principalCents)}</span>
              <span>{paidOffPercent}% paid</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(paidOffPercent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {isTaxEligible && (
        <div className="mb-6 border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Tax History</h2>
            <Link
              href={`/tax/add?accountId=${id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Tax Record
            </Link>
          </div>
          {taxRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tax records yet.</p>
          ) : (
            <div className="space-y-1">
              {taxRecords.map((r) => {
                const scheduleInterestCents =
                  isMortgage && r.formType === "FORM_1098" ? scheduleInterestByYear[r.taxYear] : undefined;
                const principalDiffCents =
                  isMortgage && r.formType === "FORM_1098" && r.outstandingPrincipalCents != null
                    ? r.outstandingPrincipalCents - currentBalanceCents
                    : null;
                return (
                  <div key={r.id} className="py-2 px-3 rounded-md hover:bg-muted/50 text-sm space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-muted-foreground w-12 shrink-0">{r.taxYear}</span>
                        <Badge variant="outline" className="shrink-0">
                          {TAX_FORM_LABEL[r.formType] ?? r.formType}
                        </Badge>
                        <span className="font-medium truncate">{r.payerName}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="font-medium tabular-nums">{formatCents(taxRecordAmountCents(r))}</span>
                        <Link
                          href={`/tax/${r.id}/edit`}
                          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <DeleteTaxRecordButton id={r.id} payerName={r.payerName} />
                      </div>
                    </div>
                    {(scheduleInterestCents != null || (principalDiffCents != null && principalDiffCents !== 0)) && (
                      <div className="pl-[3.75rem] text-xs text-muted-foreground space-y-0.5">
                        {scheduleInterestCents != null && (
                          <p>
                            Form 1098 interest paid: {formatCents(r.mortgageInterestPaidCents ?? 0)} vs.{" "}
                            {formatCents(scheduleInterestCents)} from the tracked payment schedule
                            {" — "}differs by{" "}
                            {formatCents(Math.abs((r.mortgageInterestPaidCents ?? 0) - scheduleInterestCents))}
                          </p>
                        )}
                        {principalDiffCents != null && principalDiffCents !== 0 && (
                          <p>
                            Form 1098 outstanding principal: {formatCents(r.outstandingPrincipalCents ?? 0)}
                            {" — "}differs from tracked balance by {formatCents(Math.abs(principalDiffCents))}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {isMortgage ? (
        <>
          <h2 className="text-lg font-medium mb-3">
            Payment Schedule
            {scheduleRows.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {scheduleRows.length} payments
              </span>
            )}
          </h2>
          {scheduleRows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No payment data available.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[640px] overflow-y-auto">
                <table className="w-full text-sm tabular-nums">
                  <thead className="sticky top-0 bg-background border-b z-10">
                    <tr className="text-muted-foreground text-xs">
                      <th className="text-left py-2 px-3 font-medium w-10">#</th>
                      <th className="text-left py-2 px-3 font-medium">Date</th>
                      <th className="text-right py-2 px-3 font-medium">Payment</th>
                      <th className="text-right py-2 px-3 font-medium">Principal</th>
                      <th className="text-right py-2 px-3 font-medium">Interest</th>
                      <th className="text-right py-2 px-3 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleRows.map((row) => {
                      const isPast = new Date(row.paymentDate) <= today;
                      const isNext =
                        nextPayment && row.paymentNumber === nextPayment.paymentNumber;
                      return (
                        <tr
                          key={row.paymentNumber}
                          className={cn(
                            "border-b last:border-0 transition-colors",
                            isNext
                              ? "bg-primary/10 font-medium"
                              : isPast
                              ? "hover:bg-muted/30"
                              : "text-muted-foreground hover:bg-muted/20"
                          )}
                        >
                          <td className="py-1.5 px-3">{row.paymentNumber}</td>
                          <td className="py-1.5 px-3">
                            {new Date(row.paymentDate).toLocaleDateString("en-US", {
                              month: "short",
                              year: "numeric",
                              timeZone: "UTC",
                            })}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            {formatCents(row.paymentCents)}
                          </td>
                          <td
                            className={cn(
                              "py-1.5 px-3 text-right",
                              row.principalCents < 0 ? "text-destructive" : ""
                            )}
                          >
                            {formatCents(row.principalCents)}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            {formatCents(row.interestCents)}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            {formatCents(row.balanceCents)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Recent Transactions</h2>
            {(account.type === "CHECKING" || account.type === "CREDIT_CARD") && (
              <Link
                href={`/accounts/${id}/import`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <Upload className="h-3 w-3 mr-1" />
                Import Transactions
              </Link>
            )}
          </div>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No transactions yet.</p>
          ) : (
            <div className="space-y-1">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground w-24 shrink-0">
                      {new Date(t.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })}
                    </span>
                    <span className="font-medium">{t.description}</span>
                  </div>
                  <span
                    className={`font-medium tabular-nums ${
                      t.type === "INCOME" ? "text-emerald-600" : "text-destructive"
                    }`}
                  >
                    {t.type === "INCOME" ? "+" : "-"}
                    {formatCents(t.amountCents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
