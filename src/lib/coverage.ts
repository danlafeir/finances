// What data each account has, and what's left to download, judged against the
// last completed month-end. All dates are UTC calendar days ("YYYY-MM-DD").

export interface CoverageInput {
  id: string;
  name: string;
  type: string;
  snapshotDate: Date | null;
  snapshotCount: number;
  transactionCount: number;
  firstTransactionDate: Date | null;
  lastTransactionDate: Date | null;
  statementCount: number;
  lastStatementDate: Date | null;
  hasMortgageSchedule: boolean;
}

export type Need =
  | { kind: "csv"; from: string; to: string }
  | { kind: "balance"; asOf: string[] };

export type CoverageStatus = "current" | "needs-data" | "automatic";

export interface AccountCoverage extends CoverageInput {
  status: CoverageStatus;
  need: Need | null;
  // A transaction account's balance is its last snapshot plus later transactions;
  // a fresh snapshot is optional but lets you reconcile against the statement.
  reconcileAsOf: string | null;
  daysSinceSnapshot: number | null;
  note: string | null;
}

const DAY_MS = 86_400_000;

export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function lastMonthEnd(today: Date): Date {
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
}

function addDays(day: string, days: number): string {
  return isoDay(new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS));
}

// Month-ends strictly after `after`, up to and including `target`, oldest first.
// Without a prior snapshot only the target is returned, so a brand-new account
// isn't asked for years of history.
function monthEndsAfter(after: Date | null, target: Date, max = 12): string[] {
  const ends: string[] = [];
  for (let i = 0; i < max; i++) {
    const end = Date.UTC(target.getUTCFullYear(), target.getUTCMonth() - i + 1, 0);
    if (after === null ? i > 0 : end <= after.getTime()) break;
    ends.unshift(isoDay(new Date(end)));
  }
  return ends;
}

export function assessAccount(input: CoverageInput, today: Date): AccountCoverage {
  const target = lastMonthEnd(today);
  const targetDay = isoDay(target);
  const daysSinceSnapshot = input.snapshotDate
    ? Math.floor((Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - input.snapshotDate.getTime()) / DAY_MS)
    : null;
  const base = { ...input, daysSinceSnapshot, need: null, reconcileAsOf: null, note: null };

  if (input.type === "MORTGAGE" && input.hasMortgageSchedule) {
    return { ...base, status: "automatic", note: "Balance follows the payment schedule. Only the year-end Form 1098 is needed." };
  }

  const snapshotCurrent = input.snapshotDate !== null && input.snapshotDate.getTime() >= target.getTime();

  if (input.type === "CHECKING" || input.type === "CREDIT_CARD") {
    const covered = input.lastTransactionDate ?? input.snapshotDate;
    const coveredDay = covered ? isoDay(covered) : null;
    const reconcileAsOf = snapshotCurrent ? null : targetDay;
    if (coveredDay !== null && coveredDay >= targetDay) {
      return { ...base, status: "current", reconcileAsOf };
    }
    return {
      ...base,
      status: "needs-data",
      need: { kind: "csv", from: coveredDay ? addDays(coveredDay, 1) : "", to: targetDay },
      reconcileAsOf,
    };
  }

  if (snapshotCurrent) return { ...base, status: "current" };

  const note =
    input.type === "STOCK_PLAN"
      ? "Record the unvested amount from your plan statement."
      : null;
  return {
    ...base,
    status: "needs-data",
    need: { kind: "balance", asOf: monthEndsAfter(input.snapshotDate, target) },
    note,
  };
}

