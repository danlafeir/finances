import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TaxYearPicker } from "@/components/tax/TaxYearPicker";
import { DeleteTaxRecordButton } from "@/components/tax/DeleteTaxRecordButton";
import { CapitalGainsChart } from "@/components/tax/CapitalGainsChart";
import {
  getTaxYearsWithData,
  getTaxRecords,
  getTaxReconciliation,
  getTaxOverview,
} from "@/actions/tax";
import { formatCents } from "@/lib/money";
import { TAX_FORM_LABEL } from "@/lib/tax/forms";
import { Pencil, AlertTriangle, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaxRecord } from "@/generated/prisma/client";

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

const SALT_CAP_CENTS = 1_000_000; // $10,000 — Schedule A line 5e cap

function ComparisonBar({
  label,
  cents,
  maxCents,
  colorClass,
}: {
  label: string;
  cents: number;
  maxCents: number;
  colorClass: string;
}) {
  const pct = maxCents > 0 ? Math.min(100, (cents / maxCents) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{formatCents(cents)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full", colorClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
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

  const untrackedGainsCents = overview.unattributedCapitalGainCents;

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

      {(overview.shortTermCapitalGainCents !== 0 || overview.longTermCapitalGainCents !== 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground font-normal">
              Capital Gains: Short-Term vs. Long-Term
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CapitalGainsChart
              shortTermCents={overview.shortTermCapitalGainCents}
              longTermCents={overview.longTermCapitalGainCents}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Short-term gains are taxed at your ordinary rate; long-term gains get preferential
              capital-gains rates — realizing gains after the one-year mark can meaningfully lower
              the tax on them.
            </p>
          </CardContent>
        </Card>
      )}

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
        ) : (() => {
          const rs = reconciliation.returnSummary;
          const hasDeductionCompare = rs.deductionCents != null || rs.itemizedDeductionsCents != null;
          const deductionMax = Math.max(rs.deductionCents ?? 0, rs.itemizedDeductionsCents ?? 0, 1);
          const hasAmtOrSurtax =
            rs.amtiCents != null ||
            rs.tentativeMinimumTaxCents != null ||
            rs.amtCents != null ||
            rs.additionalMedicareTaxCents != null ||
            rs.netInvestmentIncomeTaxCents != null ||
            rs.estimatedTaxPenaltyCents != null;
          const hasOtherDeductions =
            rs.qbiDeductionCents != null || rs.iraDeductionCents != null || rs.hsaDeductionCents != null;

          return (
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

            {hasDeductionCompare && (
              <div className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">Standard vs. Itemized Deductions</p>
                {rs.deductionCents != null && (
                  <ComparisonBar
                    label="Deduction Taken (Line 12)"
                    cents={rs.deductionCents}
                    maxCents={deductionMax}
                    colorClass="bg-primary"
                  />
                )}
                {rs.itemizedDeductionsCents != null && (
                  <ComparisonBar
                    label="Itemized Total (Schedule A, Line 17)"
                    cents={rs.itemizedDeductionsCents}
                    maxCents={deductionMax}
                    colorClass="bg-indigo-500"
                  />
                )}
                {rs.deductionCents != null && rs.itemizedDeductionsCents != null && (
                  <p className="text-xs text-muted-foreground">
                    {rs.deductionCents > rs.itemizedDeductionsCents
                      ? `You took the standard deduction — itemizing would have given you ${formatCents(
                          rs.deductionCents - rs.itemizedDeductionsCents
                        )} less.`
                      : rs.deductionCents < rs.itemizedDeductionsCents
                        ? `You itemized — that's ${formatCents(
                            rs.itemizedDeductionsCents - rs.deductionCents
                          )} more than the standard deduction would have given you.`
                        : "Your deduction matches your itemized total exactly."}
                  </p>
                )}
                {rs.saltDeductionCents != null && (
                  <div className="pt-1 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>SALT deduction (Schedule A, Line 5e)</span>
                      <span className="tabular-nums">
                        {formatCents(rs.saltDeductionCents)} of {formatCents(SALT_CAP_CENTS)} cap
                      </span>
                    </div>
                    <Progress value={Math.min(100, (rs.saltDeductionCents / SALT_CAP_CENTS) * 100)} />
                    {rs.saltDeductionCents >= SALT_CAP_CENTS && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        You hit the $10,000 SALT cap — any additional state/local tax paid bought
                        you nothing federally
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {hasOtherDeductions && (
              <div className="border rounded-lg p-4">
                <p className="text-sm font-medium mb-3">Other Deductions</p>
                <div className="grid gap-3 sm:grid-cols-3 text-sm">
                  {rs.qbiDeductionCents != null && (
                    <div>
                      <p className="text-muted-foreground text-xs">
                        Qualified Business Income (Line 13)
                      </p>
                      <p className="font-semibold tabular-nums">{formatCents(rs.qbiDeductionCents)}</p>
                    </div>
                  )}
                  {rs.iraDeductionCents != null && (
                    <div>
                      <p className="text-muted-foreground text-xs">IRA Deduction (Sch. 1, Line 20)</p>
                      <p className="font-semibold tabular-nums">{formatCents(rs.iraDeductionCents)}</p>
                    </div>
                  )}
                  {rs.hsaDeductionCents != null && (
                    <div>
                      <p className="text-muted-foreground text-xs">HSA Deduction (Sch. 1, Line 13)</p>
                      <p className="font-semibold tabular-nums">{formatCents(rs.hsaDeductionCents)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {hasAmtOrSurtax && (
              <div className="border rounded-lg p-4">
                <p className="text-sm font-medium mb-3">AMT &amp; Additional Taxes</p>
                <div className="grid gap-3 sm:grid-cols-3 text-sm">
                  {rs.amtiCents != null && (
                    <div>
                      <p className="text-muted-foreground text-xs">AMT Taxable Income</p>
                      <p className="font-semibold tabular-nums">{formatCents(rs.amtiCents)}</p>
                    </div>
                  )}
                  {rs.tentativeMinimumTaxCents != null && (
                    <div>
                      <p className="text-muted-foreground text-xs">Tentative Minimum Tax</p>
                      <p className="font-semibold tabular-nums">
                        {formatCents(rs.tentativeMinimumTaxCents)}
                      </p>
                    </div>
                  )}
                  {rs.amtCents != null && (
                    <div>
                      <p className="text-muted-foreground text-xs">AMT Owed</p>
                      <p
                        className={cn(
                          "font-semibold tabular-nums",
                          rs.amtCents > 0 && "text-amber-600"
                        )}
                      >
                        {formatCents(rs.amtCents)}
                      </p>
                    </div>
                  )}
                  {rs.additionalMedicareTaxCents != null && (
                    <div>
                      <p className="text-muted-foreground text-xs">Additional Medicare Tax</p>
                      <p className="font-semibold tabular-nums">
                        {formatCents(rs.additionalMedicareTaxCents)}
                      </p>
                    </div>
                  )}
                  {rs.netInvestmentIncomeTaxCents != null && (
                    <div>
                      <p className="text-muted-foreground text-xs">Net Investment Income Tax</p>
                      <p className="font-semibold tabular-nums">
                        {formatCents(rs.netInvestmentIncomeTaxCents)}
                      </p>
                    </div>
                  )}
                  {rs.estimatedTaxPenaltyCents != null && (
                    <div>
                      <p className="text-muted-foreground text-xs">Underpayment Penalty</p>
                      <p
                        className={cn(
                          "font-semibold tabular-nums",
                          rs.estimatedTaxPenaltyCents > 0 && "text-destructive"
                        )}
                      >
                        {formatCents(rs.estimatedTaxPenaltyCents)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {rs.capitalLossCarryoverCents != null && rs.capitalLossCarryoverCents > 0 && (
              <div className="border border-emerald-600/30 bg-emerald-600/5 rounded-lg p-4 text-sm flex items-start gap-2">
                <PiggyBank className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <p>
                  <span className="font-medium">{formatCents(rs.capitalLossCarryoverCents)}</span>{" "}
                  in capital losses carries into {currentYear + 1} — remember to net it against
                  future gains.
                </p>
              </div>
            )}

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
                                {Math.abs(gapCents) > 100
                                  ? `${formatCents(Math.abs(gapCents))} not yet accounted for by a tracked account`
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
          );
        })()}
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
