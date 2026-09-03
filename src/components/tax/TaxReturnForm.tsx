"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { upsertTaxReturnSummary } from "@/actions/tax";
import { TaxReturnSummaryInput } from "@/lib/schemas";
import { parseDollarsToCents, centsToDisplay } from "@/lib/money";
import { parseCsvText } from "@/lib/csv/parser";
import { stripCodeFence } from "@/lib/tax/csv";
import { parseTaxReturnCsvRow, type TaxReturnCsvData } from "@/lib/tax/returnCsv";
import type { TaxReturnSummary } from "@/generated/prisma/client";

interface TaxReturnFormProps {
  summary?: TaxReturnSummary | null;
  defaultYear: number;
}

export function TaxReturnForm({ summary, defaultYear }: TaxReturnFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<TaxReturnCsvData | null>(null);
  const [formKey, setFormKey] = useState(0);

  function handlePrefill() {
    try {
      const { rows } = parseCsvText(stripCodeFence(pasted));
      const { data, error: parseErr } = parseTaxReturnCsvRow(rows);
      if (parseErr) {
        setPasteError(parseErr);
        return;
      }
      setPasteError(null);
      setPrefill(data);
      setFormKey((k) => k + 1);
    } catch (e) {
      setPasteError(e instanceof Error ? e.message : "Failed to parse CSV");
    }
  }

  const initial = prefill ?? summary ?? null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const taxYear = parseInt(fd.get("taxYear") as string, 10);
    const filingStatus = ((fd.get("filingStatus") as string) || "").trim() || null;
    const notes = ((fd.get("notes") as string) || "").trim() || null;

    function centsOrNull(field: string): number | null {
      const raw = (fd.get(field) as string) || "";
      return raw.trim() ? parseDollarsToCents(raw) : null;
    }

    try {
      const data: TaxReturnSummaryInput = {
        taxYear,
        filingStatus,
        agiCents: parseDollarsToCents(fd.get("agiCents") as string),
        taxableIncomeCents: parseDollarsToCents(fd.get("taxableIncomeCents") as string),
        totalTaxCents: parseDollarsToCents(fd.get("totalTaxCents") as string),
        totalPaymentsCents: centsOrNull("totalPaymentsCents"),
        refundCents: centsOrNull("refundCents"),
        amountOwedCents: centsOrNull("amountOwedCents"),
        taxableInterestCents: centsOrNull("taxableInterestCents"),
        ordinaryDividendsCents: centsOrNull("ordinaryDividendsCents"),
        qualifiedDividendsCents: centsOrNull("qualifiedDividendsCents"),
        capitalGainCents: centsOrNull("capitalGainCents"),
        shortTermCapitalGainCents: centsOrNull("shortTermCapitalGainCents"),
        longTermCapitalGainCents: centsOrNull("longTermCapitalGainCents"),
        capitalLossCarryoverCents: centsOrNull("capitalLossCarryoverCents"),
        deductionCents: centsOrNull("deductionCents"),
        itemizedDeductionsCents: centsOrNull("itemizedDeductionsCents"),
        saltDeductionCents: centsOrNull("saltDeductionCents"),
        mortgageInterestDeductionCents: centsOrNull("mortgageInterestDeductionCents"),
        qbiDeductionCents: centsOrNull("qbiDeductionCents"),
        iraDeductionCents: centsOrNull("iraDeductionCents"),
        hsaDeductionCents: centsOrNull("hsaDeductionCents"),
        amtiCents: centsOrNull("amtiCents"),
        tentativeMinimumTaxCents: centsOrNull("tentativeMinimumTaxCents"),
        amtCents: centsOrNull("amtCents"),
        additionalMedicareTaxCents: centsOrNull("additionalMedicareTaxCents"),
        netInvestmentIncomeTaxCents: centsOrNull("netInvestmentIncomeTaxCents"),
        estimatedTaxPenaltyCents: centsOrNull("estimatedTaxPenaltyCents"),
        notes,
      };

      const parsed = TaxReturnSummaryInput.parse(data);
      await upsertTaxReturnSummary(parsed);

      router.push(`/tax?year=${taxYear}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function display(cents: number | null | undefined): string {
    return cents != null ? centsToDisplay(cents) : "";
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="border rounded-lg p-4 space-y-2">
        <Label htmlFor="pasteReturn">Paste the CSV your AI tool returned to prefill the form below</Label>
        <textarea
          id="pasteReturn"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="Tax Year,Filing Status,Adjusted Gross Income,..."
          className="w-full min-h-[80px] rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm font-mono outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button type="button" size="sm" variant="outline" disabled={!pasted.trim()} onClick={handlePrefill}>
          Parse &amp; Prefill
        </Button>
        {pasteError && <p className="text-sm text-destructive">{pasteError}</p>}
      </div>

      <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="taxYear">Tax Year</Label>
            <Input
              id="taxYear"
              name="taxYear"
              type="number"
              required
              defaultValue={initial?.taxYear ?? defaultYear}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filingStatus">
              Filing Status <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="filingStatus"
              name="filingStatus"
              defaultValue={initial?.filingStatus ?? ""}
              placeholder="e.g. Married Filing Jointly"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="agiCents">Adjusted Gross Income</Label>
            <CurrencyInput
              id="agiCents"
              name="agiCents"
              required
              placeholder="$0.00"
              defaultValue={display(initial?.agiCents)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="taxableIncomeCents">Taxable Income</Label>
            <CurrencyInput
              id="taxableIncomeCents"
              name="taxableIncomeCents"
              required
              placeholder="$0.00"
              defaultValue={display(initial?.taxableIncomeCents)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="totalTaxCents">Total Tax</Label>
            <CurrencyInput
              id="totalTaxCents"
              name="totalTaxCents"
              required
              placeholder="$0.00"
              defaultValue={display(initial?.totalTaxCents)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="totalPaymentsCents">Total Payments</Label>
            <CurrencyInput
              id="totalPaymentsCents"
              name="totalPaymentsCents"
              placeholder="$0.00"
              defaultValue={display(initial?.totalPaymentsCents)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="refundCents">Refund Amount</Label>
            <CurrencyInput
              id="refundCents"
              name="refundCents"
              placeholder="$0.00"
              defaultValue={display(initial?.refundCents)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amountOwedCents">Amount Owed</Label>
            <CurrencyInput
              id="amountOwedCents"
              name="amountOwedCents"
              placeholder="$0.00"
              defaultValue={display(initial?.amountOwedCents)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="taxableInterestCents">Taxable Interest (Line 2b)</Label>
            <CurrencyInput
              id="taxableInterestCents"
              name="taxableInterestCents"
              placeholder="$0.00"
              defaultValue={display(initial?.taxableInterestCents)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ordinaryDividendsCents">Ordinary Dividends (Line 3b)</Label>
            <CurrencyInput
              id="ordinaryDividendsCents"
              name="ordinaryDividendsCents"
              placeholder="$0.00"
              defaultValue={display(initial?.ordinaryDividendsCents)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qualifiedDividendsCents">Qualified Dividends (Line 3a)</Label>
            <CurrencyInput
              id="qualifiedDividendsCents"
              name="qualifiedDividendsCents"
              placeholder="$0.00"
              defaultValue={display(initial?.qualifiedDividendsCents)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capitalGainCents">Capital Gain or Loss (Line 7)</Label>
            <CurrencyInput
              id="capitalGainCents"
              name="capitalGainCents"
              placeholder="$0.00 (use - for a loss)"
              defaultValue={display(initial?.capitalGainCents)}
            />
          </div>
        </div>

        <h2 className="text-sm font-medium text-muted-foreground pt-2">Capital Gains (Schedule D)</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="shortTermCapitalGainCents">Short-Term Gain or Loss (Line 7)</Label>
            <CurrencyInput
              id="shortTermCapitalGainCents"
              name="shortTermCapitalGainCents"
              placeholder="$0.00 (use - for a loss)"
              defaultValue={display(initial?.shortTermCapitalGainCents)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="longTermCapitalGainCents">Long-Term Gain or Loss (Line 15)</Label>
            <CurrencyInput
              id="longTermCapitalGainCents"
              name="longTermCapitalGainCents"
              placeholder="$0.00 (use - for a loss)"
              defaultValue={display(initial?.longTermCapitalGainCents)}
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="capitalLossCarryoverCents">
              Capital Loss Carryover to Next Year{" "}
              <span className="text-muted-foreground font-normal">
                (from the Capital Loss Carryover Worksheet, if any — always positive)
              </span>
            </Label>
            <CurrencyInput
              id="capitalLossCarryoverCents"
              name="capitalLossCarryoverCents"
              placeholder="$0.00"
              defaultValue={display(initial?.capitalLossCarryoverCents)}
            />
          </div>
        </div>

        <h2 className="text-sm font-medium text-muted-foreground pt-2">Deductions</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="deductionCents">Deduction Taken (Line 12)</Label>
            <CurrencyInput
              id="deductionCents"
              name="deductionCents"
              placeholder="$0.00"
              defaultValue={display(initial?.deductionCents)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="itemizedDeductionsCents">
              Itemized Deductions Total (Schedule A, Line 17)
            </Label>
            <CurrencyInput
              id="itemizedDeductionsCents"
              name="itemizedDeductionsCents"
              placeholder="$0.00"
              defaultValue={display(initial?.itemizedDeductionsCents)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="saltDeductionCents">SALT Deduction (Schedule A, Line 5e)</Label>
            <CurrencyInput
              id="saltDeductionCents"
              name="saltDeductionCents"
              placeholder="$0.00"
              defaultValue={display(initial?.saltDeductionCents)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mortgageInterestDeductionCents">Mortgage Interest Deduction (Schedule A)</Label>
            <CurrencyInput
              id="mortgageInterestDeductionCents"
              name="mortgageInterestDeductionCents"
              placeholder="$0.00"
              defaultValue={display(initial?.mortgageInterestDeductionCents)}
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="qbiDeductionCents">Qualified Business Income Deduction (Line 13)</Label>
            <CurrencyInput
              id="qbiDeductionCents"
              name="qbiDeductionCents"
              placeholder="$0.00"
              defaultValue={display(initial?.qbiDeductionCents)}
            />
          </div>
        </div>

        <h2 className="text-sm font-medium text-muted-foreground pt-2">Above-the-Line Deductions (Schedule 1)</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="iraDeductionCents">IRA Deduction (Line 20)</Label>
            <CurrencyInput
              id="iraDeductionCents"
              name="iraDeductionCents"
              placeholder="$0.00"
              defaultValue={display(initial?.iraDeductionCents)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hsaDeductionCents">HSA Deduction (Line 13)</Label>
            <CurrencyInput
              id="hsaDeductionCents"
              name="hsaDeductionCents"
              placeholder="$0.00"
              defaultValue={display(initial?.hsaDeductionCents)}
            />
          </div>
        </div>

        <h2 className="text-sm font-medium text-muted-foreground pt-2">
          AMT &amp; Additional Taxes
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="amtiCents">AMT Taxable Income (Form 6251, Line 4)</Label>
            <CurrencyInput
              id="amtiCents"
              name="amtiCents"
              placeholder="$0.00"
              defaultValue={display(initial?.amtiCents)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tentativeMinimumTaxCents">Tentative Minimum Tax (Form 6251, Line 7)</Label>
            <CurrencyInput
              id="tentativeMinimumTaxCents"
              name="tentativeMinimumTaxCents"
              placeholder="$0.00"
              defaultValue={display(initial?.tentativeMinimumTaxCents)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amtCents">Alternative Minimum Tax (Schedule 2, Line 1)</Label>
            <CurrencyInput
              id="amtCents"
              name="amtCents"
              placeholder="$0.00"
              defaultValue={display(initial?.amtCents)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="additionalMedicareTaxCents">
              Additional Medicare Tax (Schedule 2, Line 11)
            </Label>
            <CurrencyInput
              id="additionalMedicareTaxCents"
              name="additionalMedicareTaxCents"
              placeholder="$0.00"
              defaultValue={display(initial?.additionalMedicareTaxCents)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="netInvestmentIncomeTaxCents">
              Net Investment Income Tax (Schedule 2, Line 12)
            </Label>
            <CurrencyInput
              id="netInvestmentIncomeTaxCents"
              name="netInvestmentIncomeTaxCents"
              placeholder="$0.00"
              defaultValue={display(initial?.netInvestmentIncomeTaxCents)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estimatedTaxPenaltyCents">Estimated Tax Penalty (Line 38)</Label>
            <CurrencyInput
              id="estimatedTaxPenaltyCents"
              name="estimatedTaxPenaltyCents"
              placeholder="$0.00"
              defaultValue={display(initial?.estimatedTaxPenaltyCents)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input id="notes" name="notes" defaultValue={initial?.notes ?? ""} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : summary ? "Save Changes" : "Save Tax Return"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
