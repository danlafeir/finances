import type { ParsedRow } from "@/lib/csv/parser";
import { parseDollarsToCents } from "@/lib/money";
import type { TaxPromptTemplate } from "./csvTemplates";

const PROMPT_TAX_RETURN = `You are extracting summary figures from a complete, filed U.S. federal income tax return (Form 1040) so they can be recorded in a personal finance app.

I am attaching a PDF of my tax return package. This package may include a cover letter, filing instructions, e-file authorization forms, the federal Form 1040 and its schedules, and a STATE tax return (e.g. Form IL-1040 or similar) — use ONLY the federal Form 1040 (the two-page form titled "Form 1040, U.S. Individual Income Tax Return" at the top, with "Form 1040 (20XX)" printed at the bottom of each page). Do NOT use any state return, any worksheet, any cover/summary page, or any prior-year comparison page, even if it shows similarly-numbered lines.

Output a single CSV with exactly this header row, followed by exactly one data row:

Tax Year,Filing Status,Adjusted Gross Income,Taxable Income,Total Tax,Total Payments,Refund Amount,Amount Owed,Taxable Interest,Ordinary Dividends,Qualified Dividends,Capital Gain or Loss,Mortgage Interest Deduction,Notes

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
5. "Filing Status" is the box checked near the top of page 1 (e.g. "Single", "Married Filing Jointly", "Married Filing Separately", "Head of Household", "Qualifying Surviving Spouse").
6. "Mortgage Interest Deduction" = the home mortgage interest amount from Schedule A (Itemized Deductions), if and only if a Schedule A is included in this return. If there is no Schedule A in the return (the standard deduction was used instead — page 2, Line 12 will show a round number matching the standard deduction table, not an itemized total), leave this field blank — do not write 0.
7. If any other field is blank, not present, or you can't confidently locate it, leave it blank — do not guess or write 0 unless the return explicitly shows 0.
8. Leave the Notes column empty — it's for me to fill in later, not you.
9. Do not include any other information from the return — no Social Security Number, no address, no account numbers, no employer names. Only the fourteen fields above.

Example output (for format illustration only — replace with the real values from the attached return):
Tax Year,Filing Status,Adjusted Gross Income,Taxable Income,Total Tax,Total Payments,Refund Amount,Amount Owed,Taxable Interest,Ordinary Dividends,Qualified Dividends,Capital Gain or Loss,Mortgage Interest Deduction,Notes
2025,Married Filing Jointly,150000.00,120000.00,18500.00,19200.00,700.00,,3200.00,1400.00,1100.00,-500.00,,`;

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
    "Mortgage Interest Deduction",
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
  mortgageInterestDeductionCents: number | null;
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
    mortgageInterestDeductionCents: null,
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
    mortgageInterestDeductionCents: cents("Mortgage Interest Deduction"),
    notes: get("Notes") || null,
  };

  return { data, error };
}
