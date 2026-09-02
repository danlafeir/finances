export const ACCOUNT_TYPES = [
  { value: "CHECKING", label: "Checking" },
  { value: "CASH", label: "High Yield Savings" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "MORTGAGE", label: "Mortgage" },
  { value: "QUALIFIED_BROKERAGE", label: "Qualified Brokerage" },
  { value: "TAXABLE_BROKERAGE", label: "Taxable Brokerage" },
  { value: "STOCK_PLAN", label: "Stock Plan" },
  { value: "COLLEGE_SAVINGS", label: "529 College Savings" },
  { value: "HSA", label: "HSA" },
] as const;

export const BROKERS = [
  "Ally",
  "Betterment",
  "Bright Start 529 Plan",
  "Charles Schwab",
  "E*Trade",
  "Fidelity",
  "Morgan Stanley",
  "Northwestern Mutual",
  "Vanguard",
] as const;

export const ACCOUNT_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  ACCOUNT_TYPES.map(({ value, label }) => [value, label])
);

export const ACCOUNT_TYPE_COLOR: Record<string, string> = {
  CHECKING: "#4f86c6",
  CASH: "#4caf82",
  CREDIT_CARD: "#e05252",
  MORTGAGE: "#8b6f47",
  QUALIFIED_BROKERAGE: "#7c5cbf",
  TAXABLE_BROKERAGE: "#a855a0",
  STOCK_PLAN: "#e07b3a",
  COLLEGE_SAVINGS: "#2196a8",
  HSA: "#43a87a",
};

export const LIABILITY_TYPES = new Set(["CREDIT_CARD", "MORTGAGE"]);

export const OFF_BALANCE_SHEET_TYPES = new Set(["COLLEGE_SAVINGS", "STOCK_PLAN"]);

export const ACCOUNT_GROUPS: { label: string; subtitle?: string; types: string[] }[] = [
  { label: "Assets", types: ["CHECKING", "CASH", "HSA", "QUALIFIED_BROKERAGE", "TAXABLE_BROKERAGE"] },
  {
    label: "Off-Balance Sheet",
    subtitle: "Not counted in net worth",
    types: ["COLLEGE_SAVINGS", "STOCK_PLAN"],
  },
  { label: "Liabilities", types: ["CREDIT_CARD", "MORTGAGE"] },
];

const ACCOUNT_SORT_ORDER: Record<string, number> = {
  CHECKING: 0,
  CASH: 1,
  HSA: 2,
  COLLEGE_SAVINGS: 3,
  QUALIFIED_BROKERAGE: 4,
  TAXABLE_BROKERAGE: 5,
  STOCK_PLAN: 6,
  CREDIT_CARD: 7,
  MORTGAGE: 8,
};

export function sortAccounts<T extends { type: string; name: string }>(accounts: T[]): T[] {
  return [...accounts].sort((a, b) => {
    const ao = ACCOUNT_SORT_ORDER[a.type] ?? 99;
    const bo = ACCOUNT_SORT_ORDER[b.type] ?? 99;
    return ao !== bo ? ao - bo : a.name.localeCompare(b.name);
  });
}
