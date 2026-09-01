export const ACCOUNT_TYPES = [
  { value: "CHECKING", label: "Checking" },
  { value: "CASH", label: "High Yield Savings" },
  { value: "QUALIFIED_BROKERAGE", label: "Qualified Brokerage" },
  { value: "TAXABLE_BROKERAGE", label: "Taxable Brokerage" },
  { value: "STOCK_PLAN", label: "Stock Plan" },
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
