export interface ScheduleRow {
  paymentNumber: number;
  paymentDate: string; // YYYY-MM-DD
  paymentCents: number;
  principalCents: number;
  interestCents: number;
  balanceCents: number;
}

export interface MortgageData {
  homeValueCents: number;
  principalCents: number;
  annualRateBps: number;
  termMonths: number;
  firstPaymentDate: string; // YYYY-MM-DD
  monthlyPaymentCents: number;
  currentBalanceCents: number;
  payments: ScheduleRow[];
}

export function calcMonthlyPaymentCents(
  principalCents: number,
  annualRateBps: number,
  termMonths: number
): number {
  if (principalCents <= 0 || termMonths <= 0) return 0;
  const r = annualRateBps / 10000 / 12;
  if (r === 0) return Math.round(principalCents / termMonths);
  const payment =
    (principalCents * (r * Math.pow(1 + r, termMonths))) /
    (Math.pow(1 + r, termMonths) - 1);
  return Math.round(payment);
}

export function calcTermMonths(
  principalCents: number,
  annualRateBps: number,
  paymentCents: number
): number | null {
  if (principalCents <= 0 || annualRateBps <= 0 || paymentCents <= 0) return null;
  const r = annualRateBps / 10000 / 12;
  if (paymentCents <= principalCents * r) return null; // payment can't cover interest
  const n = -Math.log(1 - (principalCents * r) / paymentCents) / Math.log(1 + r);
  return n;
}

export interface ScheduleSummary {
  currentBalanceCents: number;
  nextPayment: ScheduleRow | null;
  paidOffPercent: number;
}

export function getScheduleSummary(
  payments: ScheduleRow[],
  principalCents: number
): ScheduleSummary {
  if (payments.length === 0) {
    return { currentBalanceCents: principalCents, nextPayment: null, paidOffPercent: 0 };
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  let currentBalanceCents = principalCents;
  let nextPayment: ScheduleRow | null = null;

  for (const p of payments) {
    if (new Date(p.paymentDate) <= today) {
      currentBalanceCents = p.balanceCents;
    } else if (nextPayment === null) {
      nextPayment = p;
    }
  }

  const paidOffPercent =
    principalCents > 0
      ? Math.max(0, Math.round(((principalCents - currentBalanceCents) / principalCents) * 100))
      : 0;

  return { currentBalanceCents, nextPayment, paidOffPercent };
}

export function generateSyntheticSchedule(
  principalCents: number,
  annualRateBps: number,
  monthlyPaymentCents: number,
  firstPaymentDate: string,
  termMonths: number
): ScheduleRow[] {
  if (principalCents <= 0 || monthlyPaymentCents <= 0 || termMonths <= 0) return [];
  const r = annualRateBps / 10000 / 12;
  const rows: ScheduleRow[] = [];
  let balance = principalCents;
  const date = new Date(firstPaymentDate + "T12:00:00Z");

  for (let i = 1; i <= termMonths && balance > 1; i++) {
    const interestCents = Math.round(balance * r);
    const principalPaid = Math.min(monthlyPaymentCents - interestCents, balance);
    if (principalPaid <= 0) break;
    balance = Math.max(0, balance - principalPaid);
    rows.push({
      paymentNumber: i,
      paymentDate: date.toISOString().slice(0, 10),
      paymentCents: principalPaid + interestCents,
      principalCents: principalPaid,
      interestCents,
      balanceCents: balance,
    });
    date.setUTCMonth(date.getUTCMonth() + 1);
  }
  return rows;
}

// Keep for use in MortgageData currentBalanceCents population
export function getCurrentBalanceCents(
  payments: ScheduleRow[],
  principalCents: number
): number {
  return getScheduleSummary(payments, principalCents).currentBalanceCents;
}
