export function formatCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function parseDollarsToCents(value: string | number): number {
  if (typeof value === "number") return Math.round(value * 100);
  const cleaned = value.replace(/[$,\s]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) throw new Error(`Cannot parse "${value}" as a dollar amount`);
  return Math.round(num * 100);
}

export function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2);
}
