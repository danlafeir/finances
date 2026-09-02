import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaxYearPicker } from "@/components/tax/TaxYearPicker";
import { DeleteTaxRecordButton } from "@/components/tax/DeleteTaxRecordButton";
import {
  getTaxYearsWithData,
  getTaxRecords,
  getTaxReconciliation,
  getTaxOverview,
} from "@/actions/tax";
import { formatCents } from "@/lib/money";
import { TAX_FORM_LABEL } from "@/lib/tax/forms";
import { Pencil, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaxRecord } from "@/generated/prisma/client";

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

function keyAmountCents(record: TaxRecord): number {
  switch (record.formType) {
    case "FORM_1099_INT":
      return record.interestIncomeCents ?? 0;
    case "FORM_1099_DIV_B":
      // Ordinary dividends already includes qualified dividends as a subset (IRS
      // convention) — sum with capital gain distributions and short/long-term gains
      // rather than showing just ordinary dividends, which is 0 for a sales-only year.
      return (
        (record.ordinaryDividendsCents ?? 0) +
        (record.capitalGainDistributionsCents ?? 0) +
        (record.shortTermCapitalGainCents ?? 0) +
        (record.longTermCapitalGainCents ?? 0)
      );
    case "FORM_1098":
      return record.mortgageInterestPaidCents ?? 0;
    default:
      return 0;
  }
}

export default async function TaxPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const years = await getTaxYearsWithData();
  const currentYear = sp.year ? parseInt(sp.year, 10) : years[0] ?? new Date().getFullYear() - 1;

  const [records, reconciliation, overview] = await Promise.all([
    getTaxRecords(currentYear),
    getTaxReconciliation(currentYear),
    getTaxOverview(currentYear),
  ]);

  const effectiveRate =
    reconciliation && reconciliation.returnSummary.taxableIncomeCents > 0
      ? `${(
          (reconciliation.returnSummary.totalTaxCents / reconciliation.returnSummary.taxableIncomeCents) *
          100
        ).toFixed(1)}%`
      : null;

  const untrackedGainsCents =
    overview.hasReturn && overview.trackedCapitalGainsCents === 0 && overview.returnCapitalGainCents
      ? overview.returnCapitalGainCents
      : null;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Tax</h1>
        <div className="flex items-center gap-3">
          <Suspense>
            <TaxYearPicker currentYear={currentYear} />
          </Suspense>
          <Link href="/tax/add" className={cn(buttonVariants({ size: "sm" }))}>
            Add Tax Data
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground font-normal">
              Ordinary Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {formatCents(overview.ordinaryIncomeCents)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Interest, non-qualified dividends, and tracked short-term gains — taxed at your
              marginal rate
              {untrackedGainsCents != null && (
                <>
                  {" "}
                  (excludes {formatCents(untrackedGainsCents)} in capital gains from your filed
                  return — see below)
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground font-normal">
              Preferential-Rate Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {formatCents(overview.preferentialIncomeCents)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Qualified dividends and tracked long-term gains — taxed at capital gains rates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground font-normal">
              Mortgage Interest Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {formatCents(overview.mortgageInterestPaidCents)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {overview.mortgageInterestPaidCents === 0
                ? "No Form 1098 tracked for this year yet"
                : "From tracked Form 1098 records"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground font-normal">
              {overview.hasReturn ? "Total Payments" : "Federal Tax Withheld"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{formatCents(overview.paymentsCents)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {overview.hasReturn
                ? "Withholding plus estimated payments, from your filed return"
                : "Already paid, from 1099 withholding"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Filed Return ({currentYear})</h2>
          <Link
            href={`/tax/return?year=${currentYear}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            {reconciliation ? "Edit" : "Add"} Filed Return
          </Link>
        </div>

        {!reconciliation ? (
          <p className="text-muted-foreground text-sm">
            No filed return on record for {currentYear}. Add one to see AGI, total tax, and how
            it compares to the tax data you&apos;ve entered.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4 text-sm border rounded-lg p-4">
              <div>
                <p className="text-muted-foreground text-xs">AGI</p>
                <p className="font-semibold tabular-nums">
                  {formatCents(reconciliation.returnSummary.agiCents)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Taxable Income</p>
                <p className="font-semibold tabular-nums">
                  {formatCents(reconciliation.returnSummary.taxableIncomeCents)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Total Tax</p>
                <p className="font-semibold tabular-nums">
                  {formatCents(reconciliation.returnSummary.totalTaxCents)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Effective Rate</p>
                <p className="font-semibold tabular-nums">{effectiveRate ?? "—"}</p>
              </div>
              {reconciliation.returnSummary.refundCents != null && (
                <div>
                  <p className="text-muted-foreground text-xs">Refund</p>
                  <p className="font-semibold tabular-nums text-emerald-600">
                    {formatCents(reconciliation.returnSummary.refundCents)}
                  </p>
                </div>
              )}
              {reconciliation.returnSummary.amountOwedCents != null && (
                <div>
                  <p className="text-muted-foreground text-xs">Amount Owed</p>
                  <p className="font-semibold tabular-nums text-destructive">
                    {formatCents(reconciliation.returnSummary.amountOwedCents)}
                  </p>
                </div>
              )}
              {reconciliation.returnSummary.capitalGainCents != null && (
                <div>
                  <p className="text-muted-foreground text-xs">Capital Gain/Loss (Line 7)</p>
                  <p className="font-semibold tabular-nums">
                    {formatCents(reconciliation.returnSummary.capitalGainCents)}
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Tracked vs. reported on the return</p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-muted-foreground text-xs">
                      <th className="text-left py-2 px-3 font-medium">Category</th>
                      <th className="text-right py-2 px-3 font-medium">On Return</th>
                      <th className="text-right py-2 px-3 font-medium">Tracked</th>
                      <th className="text-left py-2 px-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciliation.rows.map((row) => {
                      const gapCents =
                        row.reportedCents != null ? row.reportedCents - row.trackedCents : null;
                      return (
                        <tr key={row.label} className="border-t">
                          <td className="py-2 px-3">{row.label}</td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            {row.reportedCents != null ? (
                              formatCents(row.reportedCents)
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            {formatCents(row.trackedCents)}
                          </td>
                          <td className="py-2 px-3">
                            {row.status === "no-return-data" && (
                              <span className="text-xs text-muted-foreground">
                                {row.label === "Mortgage Interest Deduction"
                                  ? "Standard deduction taken — not on return"
                                  : "Not on return"}
                              </span>
                            )}
                            {row.status === "coverage" && gapCents != null && (
                              <span className="text-xs text-muted-foreground">
                                {gapCents > 100
                                  ? `${formatCents(gapCents)} not yet accounted for by a tracked account`
                                  : "Fully accounted for"}
                              </span>
                            )}
                            {row.status === "exceeds" && gapCents != null && (
                              <span className="text-xs text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Tracked exceeds the return by {formatCents(-gapCents)} — check for a
                                duplicate or wrong-year entry
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-medium mb-3">Records ({currentYear})</h2>
        {records.length === 0 ? (
          <p className="text-muted-foreground text-sm">No tax records for {currentYear} yet.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-muted-foreground text-xs">
                  <th className="text-left py-2 px-3 font-medium">Form</th>
                  <th className="text-left py-2 px-3 font-medium">Payer</th>
                  <th className="text-left py-2 px-3 font-medium">Account</th>
                  <th className="text-right py-2 px-3 font-medium">Amount</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const amountCents = keyAmountCents(r);
                  return (
                    <tr key={r.id} className="border-t hover:bg-muted/30">
                      <td className="py-2 px-3">
                        <Badge variant="outline">{TAX_FORM_LABEL[r.formType] ?? r.formType}</Badge>
                      </td>
                      <td className="py-2 px-3">{r.payerName}</td>
                      <td className="py-2 px-3">
                        {r.account ? (
                          <Link href={`/accounts/${r.account.id}`} className="hover:underline">
                            {r.account.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatCents(amountCents)}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/tax/${r.id}/edit`}
                            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                          <DeleteTaxRecordButton id={r.id} payerName={r.payerName} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
