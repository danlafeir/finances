export interface BankPreset {
  name: string;
  dateColumn: string;
  descriptionColumn: string;
  amountColumn?: string;
  idColumn?: string;
  debitAmountColumn?: string;
  creditAmountColumn?: string;
  dateFormat?: string;
}

export const BANK_PRESETS: BankPreset[] = [
  {
    name: "Chase (checking/savings)",
    dateColumn: "Posting Date",
    descriptionColumn: "Description",
    amountColumn: "Amount",
    dateFormat: "MM/DD/YYYY",
  },
  {
    name: "Chase (credit card)",
    dateColumn: "Transaction Date",
    descriptionColumn: "Description",
    amountColumn: "Amount",
    dateFormat: "MM/DD/YYYY",
  },
  {
    name: "Bank of America",
    dateColumn: "Date",
    descriptionColumn: "Description",
    amountColumn: "Amount",
    dateFormat: "MM/DD/YYYY",
  },
  {
    name: "Citi",
    dateColumn: "Date",
    descriptionColumn: "Description",
    debitAmountColumn: "Debit",
    creditAmountColumn: "Credit",
    dateFormat: "MM/DD/YYYY",
  },
  {
    name: "Wells Fargo",
    dateColumn: "Date",
    descriptionColumn: "Description",
    amountColumn: "Amount",
    dateFormat: "MM/DD/YYYY",
  },
  {
    name: "Generic CSV",
    dateColumn: "Date",
    descriptionColumn: "Description",
    amountColumn: "Amount",
  },
];

export function parseDate(value: string): Date {
  const cleaned = value.trim();
  // Try ISO first
  const iso = new Date(cleaned);
  if (!isNaN(iso.getTime())) return iso;
  // MM/DD/YYYY
  const mmddyyyy = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    return new Date(Number(mmddyyyy[3]), Number(mmddyyyy[1]) - 1, Number(mmddyyyy[2]));
  }
  throw new Error(`Cannot parse date: "${value}"`);
}

export function parseAmount(value: string): { cents: number; isDebit: boolean } {
  const cleaned = value.replace(/[$,\s]/g, "").trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) throw new Error(`Cannot parse amount: "${value}"`);
  const cents = Math.round(Math.abs(num) * 100);
  return { cents, isDebit: num < 0 };
}
