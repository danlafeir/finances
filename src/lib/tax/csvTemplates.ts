import type { TaxFormType } from "@/generated/prisma/enums";

export interface TaxCsvFieldMapping {
  header: string;
  key: string;
  kind: "payerName" | "notes" | "cents";
  required?: boolean;
}

export interface TaxPromptTemplate {
  headers: string[];
  exampleRow: string[];
  promptText: string;
}

export interface TaxCsvTemplate extends TaxPromptTemplate {
  fields: TaxCsvFieldMapping[];
}

const PROMPT_1099_INT = `You are extracting data from a U.S. tax Form 1099-INT so it can be imported into a personal finance app as a CSV file.

I am attaching an image or PDF of a Form 1099-INT. Read only the values printed on this form. Output a single CSV with exactly this header row, followed by one data row per payer shown on the form (most people only have one):

Payer Name,Interest Income,Federal Tax Withheld,Notes

Rules — follow all of them exactly:
1. Output ONLY the CSV text. No explanation, no markdown code fences, no commentary before or after it.
2. Use the header row exactly as given above, spelled exactly as shown.
3. One row per payer, not per transaction.
4. Dollar amounts must be plain decimal numbers with no "$" sign and no thousands-separator commas — e.g. 1245.67, not $1,245.67.
5. "Interest Income" is Box 1. "Federal Tax Withheld" is Box 4.
6. If a box is blank, shows $0.00, or is not present on the form, leave that CSV field empty — do not write 0 unless the form explicitly shows 0.00.
7. Do not invent, estimate, or compute any value that is not printed on the form.
8. Copy the payer name exactly as printed on the form.
9. Leave the Notes column empty — it's for me to fill in later, not you.
10. Do not include any other information from the form — no Social Security Number, no account number, no address. Only the four fields above.

Example output (for format illustration only — replace with the real values from the attached form):
Payer Name,Interest Income,Federal Tax Withheld,Notes
Ally Bank,1245.67,0.00,`;

const PROMPT_1099_DIV_B = `You are extracting data from a U.S. consolidated 1099 (1099-DIV and 1099-B sections) so it can be imported into a personal finance app as a CSV file.

I am attaching an image or PDF of a consolidated 1099 statement from a brokerage. Read only the values printed on this form. Output a single CSV with exactly this header row, followed by one data row per payer/broker shown on the form (most people only have one):

Payer Name,Ordinary Dividends,Qualified Dividends,Capital Gain Distributions,Short-Term Capital Gain or Loss,Long-Term Capital Gain or Loss,Federal Tax Withheld,Notes

Rules — follow all of them exactly:
1. Output ONLY the CSV text. No explanation, no markdown code fences, no commentary before or after it.
2. Use the header row exactly as given above, spelled exactly as shown.
3. One row per broker/payer, not per transaction and not per tax lot.
4. Dollar amounts must be plain decimal numbers with no "$" sign and no thousands-separator commas — e.g. 3200.11, not $3,200.11.
5. "Ordinary Dividends" is 1099-DIV Box 1a. "Qualified Dividends" is Box 1b. "Capital Gain Distributions" is Box 2a. "Federal Tax Withheld" is Box 4.
6. "Short-Term Capital Gain or Loss" and "Long-Term Capital Gain or Loss" come from the 1099-B section's realized gains/losses summary — brokers usually show these as separate totals labeled something like "Total short-term transactions" and "Total long-term transactions" (short-term = held one year or less, long-term = held more than one year). Each is ONE combined number across all sales in that category, not a per-lot figure.
7. Both capital gain/loss fields may be negative. If the form shows a loss (often in parentheses, or with a minus sign), write it with a leading minus sign, e.g. -120.50.
8. If you cannot confidently identify a short-term or long-term total on this form, leave that field blank rather than guessing.
9. If a box is blank, shows $0.00, or is not present on the form, leave that CSV field empty — do not write 0 unless the form explicitly shows 0.00.
10. Do not invent, estimate, or compute any value that is not printed on the form.
11. Copy the payer/broker name exactly as printed on the form.
12. Leave the Notes column empty — it's for me to fill in later, not you.
13. Do not include any other information from the form — no Social Security Number, no account number, no address, no individual lot/transaction detail. Only the seven fields above.

Example output (for format illustration only — replace with the real values from the attached form):
Payer Name,Ordinary Dividends,Qualified Dividends,Capital Gain Distributions,Short-Term Capital Gain or Loss,Long-Term Capital Gain or Loss,Federal Tax Withheld,Notes
Charles Schwab,3200.11,2800.00,450.25,-120.50,890.00,0.00,`;

const PROMPT_1098 = `You are extracting data from a U.S. tax Form 1098 (Mortgage Interest Statement) so it can be imported into a personal finance app as a CSV file.

I am attaching an image or PDF of a Form 1098. Read only the values printed on this form. Output a single CSV with exactly this header row, followed by one data row per lender shown on the form (most people only have one):

Lender Name,Mortgage Interest Paid,Outstanding Mortgage Principal,Notes

Rules — follow all of them exactly:
1. Output ONLY the CSV text. No explanation, no markdown code fences, no commentary before or after it.
2. Use the header row exactly as given above, spelled exactly as shown.
3. One row per lender, not per payment.
4. Dollar amounts must be plain decimal numbers with no "$" sign and no thousands-separator commas — e.g. 11452.30, not $11,452.30.
5. "Mortgage Interest Paid" is Box 1. "Outstanding Mortgage Principal" is Box 2.
6. If a box is blank or not present on the form, leave that CSV field empty — do not write 0 unless the form explicitly shows 0.00.
7. Do not invent, estimate, or compute any value that is not printed on the form.
8. Copy the lender name exactly as printed on the form.
9. Leave the Notes column empty — it's for me to fill in later, not you.
10. Do not include any other information from the form — no Social Security Number, no account/loan number, no property address. Only the four fields above.

Example output (for format illustration only — replace with the real values from the attached form):
Lender Name,Mortgage Interest Paid,Outstanding Mortgage Principal,Notes
Rocket Mortgage,11452.30,412300.00,`;

export const TAX_CSV_TEMPLATES: Record<TaxFormType, TaxCsvTemplate> = {
  FORM_1099_INT: {
    headers: ["Payer Name", "Interest Income", "Federal Tax Withheld", "Notes"],
    exampleRow: ["Ally Bank", "1245.67", "0.00", ""],
    promptText: PROMPT_1099_INT,
    fields: [
      { header: "Payer Name", key: "payerName", kind: "payerName", required: true },
      { header: "Interest Income", key: "interestIncomeCents", kind: "cents", required: true },
      { header: "Federal Tax Withheld", key: "federalTaxWithheldCents", kind: "cents" },
      { header: "Notes", key: "notes", kind: "notes" },
    ],
  },
  FORM_1099_DIV_B: {
    headers: [
      "Payer Name",
      "Ordinary Dividends",
      "Qualified Dividends",
      "Capital Gain Distributions",
      "Short-Term Capital Gain or Loss",
      "Long-Term Capital Gain or Loss",
      "Federal Tax Withheld",
      "Notes",
    ],
    exampleRow: ["Charles Schwab", "3200.11", "2800.00", "450.25", "-120.50", "890.00", "0.00", ""],
    promptText: PROMPT_1099_DIV_B,
    fields: [
      { header: "Payer Name", key: "payerName", kind: "payerName", required: true },
      { header: "Ordinary Dividends", key: "ordinaryDividendsCents", kind: "cents" },
      { header: "Qualified Dividends", key: "qualifiedDividendsCents", kind: "cents" },
      { header: "Capital Gain Distributions", key: "capitalGainDistributionsCents", kind: "cents" },
      { header: "Short-Term Capital Gain or Loss", key: "shortTermCapitalGainCents", kind: "cents" },
      { header: "Long-Term Capital Gain or Loss", key: "longTermCapitalGainCents", kind: "cents" },
      { header: "Federal Tax Withheld", key: "federalTaxWithheldCents", kind: "cents" },
      { header: "Notes", key: "notes", kind: "notes" },
    ],
  },
  FORM_1098: {
    headers: ["Lender Name", "Mortgage Interest Paid", "Outstanding Mortgage Principal", "Notes"],
    exampleRow: ["Rocket Mortgage", "11452.30", "412300.00", ""],
    promptText: PROMPT_1098,
    fields: [
      { header: "Lender Name", key: "payerName", kind: "payerName", required: true },
      { header: "Mortgage Interest Paid", key: "mortgageInterestPaidCents", kind: "cents", required: true },
      { header: "Outstanding Mortgage Principal", key: "outstandingPrincipalCents", kind: "cents" },
      { header: "Notes", key: "notes", kind: "notes" },
    ],
  },
};
