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
  "Betterment",
  "Vanguard",
  "Fidelity",
  "Charles Schwab",
  "E*Trade",
  "Ally",
  "Northwestern Mutual",
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
