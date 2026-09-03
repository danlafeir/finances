// Transaction/payment/snapshot dates are stored as UTC midnight of the intended
// calendar date (CSV date-only strings like "2026-09-01" parse to UTC per the
// ECMAScript spec). Every function here reads and builds dates through UTC
// accessors so a stored date's calendar month/day never shifts in timezones
// behind UTC. Use `currentMonthKey()`, not `monthKey(new Date())`, when you mean
// "the user's current wall-clock month" — that one intentionally reads local time.
export function monthKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function currentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function parseMonthKey(key: string): Date {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

export function prevMonthKey(key: string): string {
  const d = parseMonthKey(key);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return monthKey(d);
}

export function nextMonthKey(key: string): string {
  const d = parseMonthKey(key);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return monthKey(d);
}

export function monthKeyLabel(key: string): string {
  const d = parseMonthKey(key);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function monthRange(key: string): { start: Date; end: Date } {
  const start = parseMonthKey(key);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

export function shiftMonthKeyYears(key: string, years: number): string {
  const d = parseMonthKey(key);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return monthKey(d);
}

export function monthKeyShortLabel(key: string): string {
  const d = parseMonthKey(key);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
}
