export function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function parseMonthKey(key: string): Date {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

export function prevMonthKey(key: string): string {
  const d = parseMonthKey(key);
  d.setMonth(d.getMonth() - 1);
  return monthKey(d);
}

export function nextMonthKey(key: string): string {
  const d = parseMonthKey(key);
  d.setMonth(d.getMonth() + 1);
  return monthKey(d);
}

export function monthKeyLabel(key: string): string {
  const d = parseMonthKey(key);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function monthRange(key: string): { start: Date; end: Date } {
  const start = parseMonthKey(key);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function shiftMonthKeyYears(key: string, years: number): string {
  const d = parseMonthKey(key);
  d.setFullYear(d.getFullYear() + years);
  return monthKey(d);
}

export function monthKeyShortLabel(key: string): string {
  const d = parseMonthKey(key);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}
