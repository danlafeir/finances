import type { ParsedRow } from "@/lib/csv/parser";
import { parseDollarsToCents } from "@/lib/money";
import type { TaxPromptTemplate } from "./csvTemplates";

const PROMPT_TAX_RETURN = `You are extracting summary figures from a complete, filed U.S. federal income tax return (Form 1040) so they can be recorded in a personal finance app.

I am attaching a PDF of my tax return package. This package may include a cover letter, filing instructions, e-file authorization forms, the federal Form 1040 and its schedules, and a STATE tax return (e.g. Form IL-1040 or similar) — use ONLY the federal Form 1040 (the two-page form titled "Form 1040, U.S. Individual Income Tax Return" at the top, with "Form 1040 (20XX)" printed at the bottom of each page) and its attached federal schedules and forms (Schedule 1, Schedule 2, Schedule A, Schedule D, Form 6251, Form 8959, Form 8960). Do NOT use any state return, any worksheet, any cover/summary page, or any prior-year comparison page, even if it shows similarly-numbered lines.

Output a single CSV with exactly this header row, followed by exactly one data row:

Tax Year,Filing Status,Adjusted Gross Income,Taxable Income,Total Tax,Total Payments,Refund Amount,Amount Owed,Taxable Interest,Ordinary Dividends,Qualified Dividends,Capital Gain or Loss,Short-Term Capital Gain or Loss,Long-Term Capital Gain or Loss,Capital Loss Carryover to Next Year,Deduction Taken,Itemized Deductions Total,SALT Deduction,Mortgage Interest Deduction,Qualified Business Income Deduction,IRA Deduction,HSA Deduction,AMT Taxable Income,Tentative Minimum Tax,Alternative Minimum Tax,Additional Medicare Tax,Net Investment Income Tax,Estimated Tax Penalty,Notes

Rules — follow all of them exactly:
1. Output ONLY the CSV text: the header row and exactly one data row. No explanation, no markdown code fences, no commentary before or after it.
2. Use the header row exactly as given above, spelled exactly as shown.
3. Dollar amounts must be plain decimal numbers with no "$" sign and no thousands-separator commas — e.g. 660459.00, not $660,459.
4. Pull these values from the federal Form 1040, using these exact line references:
   - "Adjusted Gross Income" = page 1, Line 11
   - "Taxable Income" = page 2, Line 15
   - "Total Tax" = page 2, Line 24
   - "Total Payments" = page 2, Line 33
   - "Refund Amount" = page 2, Line 34 — leave blank if the taxpayer owed money instead of getting a refund
   - "Amount Owed" = page 2, Line 37 — leave blank if the taxpayer got a refund instead of owing
   - "Taxable Interest" = page 1, Line 2b
   - "Ordinary Dividends" = page 1, Line 3b
   - "Qualified Dividends" = page 1, Line 3a
   - "Capital Gain or Loss" = page 1, Line 7 — this may be negative; if so, write it with a leading minus sign
   - "Deduction Taken" = page 2, Line 12 (the standard deduction or itemized deductions, whichever was actually used)
   - "Qualified Business Income Deduction" = page 2, Line 13
   - "Estimated Tax Penalty" = page 2, Line 38
5. "Filing Status" is the box checked near the top of page 1 (e.g. "Single", "Married Filing Jointly", "Married Filing Separately", "Head of Household", "Qualifying Surviving Spouse").
6. Schedule D fields (only if a Schedule D is included in the return):
   - "Short-Term Capital Gain or Loss" = Schedule D, Line 7 — may be negative; if so, write it with a leading minus sign
   - "Long-Term Capital Gain or Loss" = Schedule D, Line 15 — may be negative; if so, write it with a leading minus sign
7. "Capital Loss Carryover to Next Year" = the amount of unused capital loss carrying forward to next year, found ONLY on a "Capital Loss Carryover Worksheet" or a similar statement page if the software included one — this is NOT a line printed on Schedule D itself. If no such worksheet or statement is present, leave this field blank. Always write this as a positive number even though it represents a loss — do not use a minus sign.
8. Schedule A fields (only if a Schedule A is included in the return — if the standard deduction was used instead, page 2 Line 12 will show a round number matching the standard deduction table, not an itemized total):
   - "Itemized Deductions Total" = Schedule A, Line 17
   - "SALT Deduction" = Schedule A, Line 5e (state and local taxes, after the $10,000 cap)
   - "Mortgage Interest Deduction" = Schedule A, home mortgage interest amount (Line 8e, or the relevant sub-line if broken out)
   If Schedule A is present but the standard deduction was still used (Line 12 doesn't match Schedule A's Line 17), still fill in these three Schedule A fields from Schedule A itself — they describe what itemizing would have given, separately from what was actually taken.
9. Schedule 1 fields (leave blank if the corresponding line is blank or Schedule 1 is not included):
   - "IRA Deduction" = Schedule 1, Line 20
   - "HSA Deduction" = Schedule 1, Line 13
10. Form 6251 / AMT fields — leave ALL THREE blank if no Form 6251 is included in the return:
    - "AMT Taxable Income" = Form 6251, Line 4
    - "Tentative Minimum Tax" = Form 6251, Line 7
    - "Alternative Minimum Tax" = Schedule 2, Line 1 (the AMT actually owed, which flows from Form 6251, Line 11) — if Form 6251 is included but results in $0 additional tax, write 0 rather than leaving it blank
11. "Additional Medicare Tax" = Schedule 2, Line 11 (from Form 8959) — leave blank if not present.
12. "Net Investment Income Tax" = Schedule 2, Line 12 (from Form 8960) — leave blank if not present.
13. If any field is blank, not present, or you can't confidently locate it, leave it blank — do not guess or write 0 unless the return explicitly shows 0 (per the specific exception noted for Alternative Minimum Tax above).
14. Leave the Notes column empty — it's for me to fill in later, not you.
15. Do not include any other information from the return — no Social Security Number, no address, no account numbers, no employer names. Only the fields above.

Example output (for format illustration only — replace with the real values from the attached return):
Tax Year,Filing Status,Adjusted Gross Income,Taxable Income,Total Tax,Total Payments,Refund Amount,Amount Owed,Taxable Interest,Ordinary Dividends,Qualified Dividends,Capital Gain or Loss,Short-Term Capital Gain or Loss,Long-Term Capital Gain or Loss,Capital Loss Carryover to Next Year,Deduction Taken,Itemized Deductions Total,SALT Deduction,Mortgage Interest Deduction,Qualified Business Income Deduction,IRA Deduction,HSA Deduction,AMT Taxable Income,Tentative Minimum Tax,Alternative Minimum Tax,Additional Medicare Tax,Net Investment Income Tax,Estimated Tax Penalty,Notes
2025,Married Filing Jointly,150000.00,120000.00,18500.00,19200.00,700.00,,3200.00,1400.00,1100.00,-500.00,-800.00,300.00,,29200.00,,,,,7000.00,,,,,,,,`;

export const TAX_RETURN_CSV_TEMPLATE: TaxPromptTemplate = {
  headers: [
    "Tax Year",
    "Filing Status",
    "Adjusted Gross Income",
    "Taxable Income",
    "Total Tax",
    "Total Payments",
    "Refund Amount",
    "Amount Owed",
    "Taxable Interest",
    "Ordinary Dividends",
    "Qualified Dividends",
    "Capital Gain or Loss",
    "Short-Term Capital Gain or Loss",
    "Long-Term Capital Gain or Loss",
    "Capital Loss Carryover to Next Year",
    "Deduction Taken",
    "Itemized Deductions Total",
    "SALT Deduction",
    "Mortgage Interest Deduction",
    "Qualified Business Income Deduction",
    "IRA Deduction",
    "HSA Deduction",
    "AMT Taxable Income",
    "Tentative Minimum Tax",
    "Alternative Minimum Tax",
    "Additional Medicare Tax",
    "Net Investment Income Tax",
    "Estimated Tax Penalty",
    "Notes",
  ],
  exampleRow: [
    "2025",
    "Married Filing Jointly",
    "150000.00",
    "120000.00",
    "18500.00",
    "19200.00",
    "700.00",
    "",
    "3200.00",
    "1400.00",
    "1100.00",
    "-500.00",
    "-800.00",
    "300.00",
    "",
    "29200.00",
    "",
    "",
    "",
    "",
    "7000.00",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
  ],
  promptText: PROMPT_TAX_RETURN,
};

const REQUIRED_HEADERS = ["Tax Year", "Adjusted Gross Income", "Taxable Income", "Total Tax"];

export function missingTaxReturnCsvHeaders(headers: string[]): string[] {
  const have = new Set(headers.map((h) => h.trim().toLowerCase()));
  return REQUIRED_HEADERS.filter((h) => !have.has(h.toLowerCase()));
}

export interface TaxReturnCsvData {
  taxYear?: number;
  filingStatus: string | null;
  agiCents?: number;
  taxableIncomeCents?: number;
  totalTaxCents?: number;
  totalPaymentsCents: number | null;
  refundCents: number | null;
  amountOwedCents: number | null;
  taxableInterestCents: number | null;
  ordinaryDividendsCents: number | null;
  qualifiedDividendsCents: number | null;
  capitalGainCents: number | null;
  shortTermCapitalGainCents: number | null;
  longTermCapitalGainCents: number | null;
  capitalLossCarryoverCents: number | null;
  deductionCents: number | null;
  itemizedDeductionsCents: number | null;
  saltDeductionCents: number | null;
  mortgageInterestDeductionCents: number | null;
  qbiDeductionCents: number | null;
  iraDeductionCents: number | null;
  hsaDeductionCents: number | null;
  amtiCents: number | null;
  tentativeMinimumTaxCents: number | null;
  amtCents: number | null;
  additionalMedicareTaxCents: number | null;
  netInvestmentIncomeTaxCents: number | null;
  estimatedTaxPenaltyCents: number | null;
  notes: string | null;
}

export interface TaxReturnCsvResult {
  data: TaxReturnCsvData;
  error: string | null;
}

export function parseTaxReturnCsvRow(rows: ParsedRow[]): TaxReturnCsvResult {
  const emptyData: TaxReturnCsvData = {
    filingStatus: null,
    totalPaymentsCents: null,
    refundCents: null,
    amountOwedCents: null,
    taxableInterestCents: null,
    ordinaryDividendsCents: null,
    qualifiedDividendsCents: null,
    capitalGainCents: null,
    shortTermCapitalGainCents: null,
    longTermCapitalGainCents: null,
    capitalLossCarryoverCents: null,
    deductionCents: null,
    itemizedDeductionsCents: null,
    saltDeductionCents: null,
    mortgageInterestDeductionCents: null,
    qbiDeductionCents: null,
    iraDeductionCents: null,
    hsaDeductionCents: null,
    amtiCents: null,
    tentativeMinimumTaxCents: null,
    amtCents: null,
    additionalMedicareTaxCents: null,
    netInvestmentIncomeTaxCents: null,
    estimatedTaxPenaltyCents: null,
    notes: null,
  };

  if (rows.length === 0) {
    return { data: emptyData, error: "No data row found." };
  }

  const row = rows[0];
  const normalized = new Map(Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v]));
  const get = (header: string) => normalized.get(header.toLowerCase())?.trim() ?? "";

  let error: string | null = null;

  function cents(header: string, required = false): number | null {
    const raw = get(header);
    if (!raw) {
      if (required) error = error ?? `Missing ${header}`;
      return null;
    }
    try {
      return parseDollarsToCents(raw);
    } catch {
      error = error ?? `Could not read "${raw}" as a dollar amount for ${header}`;
      return null;
    }
  }

  const taxYearRaw = get("Tax Year");
  const taxYearParsed = taxYearRaw ? parseInt(taxYearRaw, 10) : NaN;
  if (!taxYearRaw || isNaN(taxYearParsed)) error = error ?? "Missing or invalid Tax Year";

  const data: TaxReturnCsvData = {
    taxYear: isNaN(taxYearParsed) ? undefined : taxYearParsed,
    filingStatus: get("Filing Status") || null,
    agiCents: cents("Adjusted Gross Income", true) ?? undefined,
    taxableIncomeCents: cents("Taxable Income", true) ?? undefined,
    totalTaxCents: cents("Total Tax", true) ?? undefined,
    totalPaymentsCents: cents("Total Payments"),
    refundCents: cents("Refund Amount"),
    amountOwedCents: cents("Amount Owed"),
    taxableInterestCents: cents("Taxable Interest"),
    ordinaryDividendsCents: cents("Ordinary Dividends"),
    qualifiedDividendsCents: cents("Qualified Dividends"),
    capitalGainCents: cents("Capital Gain or Loss"),
    shortTermCapitalGainCents: cents("Short-Term Capital Gain or Loss"),
    longTermCapitalGainCents: cents("Long-Term Capital Gain or Loss"),
    capitalLossCarryoverCents: cents("Capital Loss Carryover to Next Year"),
    deductionCents: cents("Deduction Taken"),
    itemizedDeductionsCents: cents("Itemized Deductions Total"),
    saltDeductionCents: cents("SALT Deduction"),
    mortgageInterestDeductionCents: cents("Mortgage Interest Deduction"),
    qbiDeductionCents: cents("Qualified Business Income Deduction"),
    iraDeductionCents: cents("IRA Deduction"),
    hsaDeductionCents: cents("HSA Deduction"),
    amtiCents: cents("AMT Taxable Income"),
    tentativeMinimumTaxCents: cents("Tentative Minimum Tax"),
    amtCents: cents("Alternative Minimum Tax"),
    additionalMedicareTaxCents: cents("Additional Medicare Tax"),
    netInvestmentIncomeTaxCents: cents("Net Investment Income Tax"),
    estimatedTaxPenaltyCents: cents("Estimated Tax Penalty"),
    notes: get("Notes") || null,
  };

  return { data, error };
}
