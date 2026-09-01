"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Upload, AlertTriangle, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseCsvText } from "@/lib/csv/parser";
import { formatCents } from "@/lib/money";
import {
  calcMonthlyPaymentCents,
  calcTermMonths,
  getCurrentBalanceCents,
  type MortgageData,
  type ScheduleRow,
} from "@/lib/mortgage";

interface Issue {
  type: "error" | "warning" | "info";
  message: string;
}

interface InitialValues {
  homeValueCents: number;
  principalCents: number;
  annualRateBps: number;
  termMonths: number;
  firstPaymentDate: string;
  payments: ScheduleRow[];
}

interface Props {
  initial?: InitialValues;
  onChange: (data: MortgageData | null, isValid: boolean) => void;
}

function detectColumns(headers: string[]) {
  // Try keywords in priority order — first match wins.
  const findBest = (...keywords: string[]) => {
    for (const kw of keywords) {
      const match = headers.find((h) => h.toLowerCase().includes(kw));
      if (match) return match;
    }
    return undefined;
  };

  const dateCol = findBest("payment date", "date");
  // Exclude the date column so "Payment Date" doesn't shadow "Payment Due".
  const nonDate = headers.filter((h) => h !== dateCol);
  const findNonDate = (...keywords: string[]) => {
    for (const kw of keywords) {
      const match = nonDate.find((h) => h.toLowerCase().includes(kw));
      if (match) return match;
    }
    return undefined;
  };

  return {
    dateCol,
    paymentCol: findNonDate("payment due", "payment amount", "amount due", "payment"),
    principalCol: findBest("principal paid", "principal"),
    interestCol: findBest("interest due", "interest paid", "interest amount", "interest"),
    balanceCol: findBest("balance", "remaining"),
    numberCol: findBest("no.", "payment no", "payment #", "#"),
  };
}

function parseCents(raw: string | undefined): number {
  if (!raw) return 0;
  return Math.round(parseFloat(raw.replace(/[$,\s]/g, "") || "0") * 100);
}

export function MortgageFields({ initial, onChange }: Props) {
  const fmt = (cents: number) => (cents > 0 ? (cents / 100).toFixed(2) : "");

  const [homeValue, setHomeValue] = useState(fmt(initial?.homeValueCents ?? 0));
  const [principal, setPrincipal] = useState(fmt(initial?.principalCents ?? 0));
  const [rate, setRate] = useState(
    initial?.annualRateBps ? (initial.annualRateBps / 100).toFixed(3) : ""
  );
  const [termYears, setTermYears] = useState(
    initial?.termMonths ? String(initial.termMonths / 12) : ""
  );
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [firstPaymentDate, setFirstPaymentDate] = useState(initial?.firstPaymentDate ?? "");
  const [schedule, setSchedule] = useState<ScheduleRow[]>(initial?.payments ?? []);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  const computed = useMemo(() => {
    const homeValueCents = Math.round(parseFloat(homeValue.replace(/[$,]/g, "") || "0") * 100);
    const principalCents = Math.round(parseFloat(principal.replace(/[$,]/g, "") || "0") * 100);
    const annualRateBps = Math.round(parseFloat(rate || "0") * 100);

    const enteredPaymentCents = monthlyPayment.trim()
      ? Math.round(parseFloat(monthlyPayment.replace(/[$,]/g, "") || "0") * 100)
      : 0;

    let termFromPaymentMonths: number | null = null;
    let effectiveTermMonths: number;

    if (enteredPaymentCents > 0) {
      termFromPaymentMonths = calcTermMonths(principalCents, annualRateBps, enteredPaymentCents);
      effectiveTermMonths = termFromPaymentMonths ?? 0;
    } else {
      effectiveTermMonths = Math.round(parseFloat(termYears || "0") * 12);
    }

    const effectivePaymentCents =
      enteredPaymentCents > 0
        ? enteredPaymentCents
        : calcMonthlyPaymentCents(principalCents, annualRateBps, effectiveTermMonths);

    const issues: Issue[] = [];

    if (homeValueCents <= 0) issues.push({ type: "error", message: "Home value is required." });
    if (principalCents <= 0) issues.push({ type: "error", message: "Loan amount is required." });
    if (annualRateBps <= 0 || annualRateBps > 5000)
      issues.push({ type: "error", message: "Interest rate must be between 0.01% and 50%." });
    if (!firstPaymentDate)
      issues.push({ type: "error", message: "First payment date is required." });

    if (enteredPaymentCents > 0) {
      if (principalCents > 0 && annualRateBps > 0) {
        const monthlyInterestCents = Math.round(principalCents * (annualRateBps / 10000 / 12));
        if (enteredPaymentCents <= monthlyInterestCents) {
          issues.push({
            type: "error",
            message: `Monthly payment must exceed monthly interest (${formatCents(monthlyInterestCents)}) to pay off the loan.`,
          });
        }
      }
      if (
        termFromPaymentMonths !== null &&
        (termFromPaymentMonths < 12 || termFromPaymentMonths > 600)
      ) {
        issues.push({
          type: "error",
          message: "Computed term is outside reasonable range (1–50 years).",
        });
      }
    } else {
      if (effectiveTermMonths > 0 && (effectiveTermMonths < 12 || effectiveTermMonths > 600)) {
        issues.push({ type: "error", message: "Term must be between 1 and 50 years." });
      }
    }

    if (homeValueCents > 0 && principalCents > homeValueCents)
      issues.push({
        type: "warning",
        message: "Loan amount exceeds home value — negative equity at origination.",
      });
    else if (homeValueCents > 0 && principalCents > 0 && principalCents / homeValueCents > 0.8)
      issues.push({
        type: "warning",
        message: `LTV is ${Math.round((principalCents / homeValueCents) * 100)}% — PMI likely applies above 80%.`,
      });

    if (schedule.length > 0 && principalCents > 0) {
      const lastBalance = schedule[schedule.length - 1].balanceCents;
      if (lastBalance > 50000)
        issues.push({
          type: "warning",
          message: `Schedule final balance is ${formatCents(lastBalance)} — expected near $0.`,
        });
    }

    if (schedule.length > 0)
      issues.push({ type: "info", message: `${schedule.length} payments loaded.` });

    const hasErrors = issues.some((i) => i.type === "error");
    const currentBalanceCents = getCurrentBalanceCents(schedule, principalCents);

    const data: MortgageData | null = hasErrors
      ? null
      : {
          homeValueCents,
          principalCents,
          annualRateBps,
          termMonths: Math.round(effectiveTermMonths),
          firstPaymentDate,
          monthlyPaymentCents: effectivePaymentCents,
          currentBalanceCents,
          payments: schedule,
        };

    return {
      issues,
      effectivePaymentCents,
      data,
      isValid: !hasErrors,
      currentBalanceCents,
      homeValueCents,
      termFromPaymentMonths,
      enteredPaymentCents,
    };
  }, [homeValue, principal, rate, termYears, monthlyPayment, firstPaymentDate, schedule]);

  const stableOnChange = useCallback(onChange, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    stableOnChange(computed.data, computed.isValid);
  }, [computed.data, computed.isValid, stableOnChange]);

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setCsvError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers, rows, errors } = parseCsvText(text);

      if (errors.length) {
        setCsvError(`Parse error: ${errors[0]}`);
        return;
      }

      const cols = detectColumns(headers);
      if (!cols.dateCol || !cols.balanceCol) {
        setCsvError(
          `Could not detect required columns. Found: ${headers.join(", ")}. ` +
            `Need at least a date column and a balance column.`
        );
        return;
      }

      const parsed: ScheduleRow[] = [];
      let seq = 0;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rawDate = cols.dateCol ? row[cols.dateCol]?.trim() : "";
        if (!rawDate) continue;
        const date = new Date(rawDate);
        if (isNaN(date.getTime())) continue;
        seq++;
        const csvNum = cols.numberCol ? parseInt(row[cols.numberCol] ?? "") : NaN;

        parsed.push({
          paymentNumber: isNaN(csvNum) || csvNum <= 0 ? seq : csvNum,
          paymentDate: date.toISOString().slice(0, 10),
          paymentCents: parseCents(cols.paymentCol ? row[cols.paymentCol] : undefined),
          principalCents: parseCents(cols.principalCol ? row[cols.principalCol] : undefined),
          interestCents: parseCents(cols.interestCol ? row[cols.interestCol] : undefined),
          balanceCents: parseCents(cols.balanceCol ? row[cols.balanceCol] : undefined),
        });
      }

      if (parsed.length === 0) {
        setCsvError("No valid payment rows found in the file.");
        return;
      }

      setSchedule(parsed);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const equity =
    computed.homeValueCents > 0 && computed.currentBalanceCents > 0
      ? computed.homeValueCents - computed.currentBalanceCents
      : null;

  const today = new Date();
  const upcomingIdx = schedule.findIndex((p) => new Date(p.paymentDate) > today);
  const previewRows =
    schedule.length <= 6
      ? schedule
      : upcomingIdx > 1
      ? schedule.slice(Math.max(0, upcomingIdx - 1), upcomingIdx + 3)
      : schedule.slice(0, 4);

  const termIsLocked =
    computed.enteredPaymentCents > 0 && computed.termFromPaymentMonths !== null;
  const termDisplayValue = termIsLocked
    ? (computed.termFromPaymentMonths! / 12).toFixed(2)
    : termYears;

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
      <p className="text-sm font-medium text-muted-foreground">Mortgage Details</p>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="homeValue">Home Value</Label>
          <Input
            id="homeValue"
            value={homeValue}
            onChange={(e) => setHomeValue(e.target.value)}
            placeholder="450000.00"
            inputMode="decimal"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loanAmount">Loan Amount</Label>
          <Input
            id="loanAmount"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            placeholder="360000.00"
            inputMode="decimal"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rate">Interest Rate (%)</Label>
          <Input
            id="rate"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="6.750"
            inputMode="decimal"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="termYears">
            Term (years)
            {termIsLocked && (
              <span className="text-xs text-muted-foreground ml-1">— from payment</span>
            )}
          </Label>
          <Input
            id="termYears"
            value={termDisplayValue}
            onChange={(e) => !termIsLocked && setTermYears(e.target.value)}
            placeholder="30"
            inputMode="decimal"
            disabled={termIsLocked}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="monthlyPayment">
            Monthly Payment{" "}
            <span className="text-xs text-muted-foreground">(optional — calculates term)</span>
          </Label>
          <Input
            id="monthlyPayment"
            value={monthlyPayment}
            onChange={(e) => setMonthlyPayment(e.target.value)}
            placeholder="2000.00"
            inputMode="decimal"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="firstPaymentDate">First Payment Date</Label>
          <Input
            id="firstPaymentDate"
            type="date"
            value={firstPaymentDate}
            onChange={(e) => setFirstPaymentDate(e.target.value)}
          />
        </div>
      </div>

      {computed.enteredPaymentCents === 0 && computed.effectivePaymentCents > 0 && (
        <div className="text-sm text-muted-foreground">
          Calculated monthly payment:{" "}
          <span className="font-medium text-foreground">
            {formatCents(computed.effectivePaymentCents)}
          </span>
        </div>
      )}

      {equity !== null && (
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">Current balance </span>
            <span className="font-medium tabular-nums">
              {formatCents(computed.currentBalanceCents)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Equity </span>
            <span
              className={`font-medium tabular-nums ${equity >= 0 ? "text-primary" : "text-destructive"}`}
            >
              {formatCents(equity)}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Amortization Schedule (optional)</Label>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-md cursor-pointer hover:bg-accent transition-colors">
            <Upload className="h-3 w-3" />
            {csvFileName ?? "Upload CSV"}
            <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          </label>
          {schedule.length > 0 && (
            <span className="text-xs text-muted-foreground">{schedule.length} payments</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          CSV should include columns for date, payment, principal, interest, and balance.
        </p>
        {csvError && <p className="text-xs text-destructive">{csvError}</p>}
      </div>

      {computed.issues.length > 0 && (
        <div className="space-y-1.5">
          {computed.issues.map((issue, i) => (
            <div
              key={i}
              className={`flex gap-2 text-xs ${
                issue.type === "error"
                  ? "text-destructive"
                  : issue.type === "warning"
                  ? "text-amber-600"
                  : "text-muted-foreground"
              }`}
            >
              {issue.type === "error" || issue.type === "warning" ? (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              ) : (
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              )}
              {issue.message}
            </div>
          ))}
        </div>
      )}

      {previewRows.length > 0 && (
        <div className="overflow-x-auto">
          <p className="text-xs text-muted-foreground mb-1.5">
            {upcomingIdx > 1 ? "Payments around today" : "First payments"}
          </p>
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-muted-foreground border-b">
                <th className="text-left pb-1 pr-3">#</th>
                <th className="text-left pb-1 pr-3">Date</th>
                <th className="text-right pb-1 pr-3">Payment</th>
                <th className="text-right pb-1 pr-3">Principal</th>
                <th className="text-right pb-1 pr-3">Interest</th>
                <th className="text-right pb-1">Balance</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row) => {
                const isPast = new Date(row.paymentDate) <= today;
                return (
                  <tr key={row.paymentNumber} className={isPast ? "text-muted-foreground" : ""}>
                    <td className="py-0.5 pr-3">{row.paymentNumber}</td>
                    <td className="py-0.5 pr-3">
                      {new Date(row.paymentDate).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-0.5 pr-3 text-right">{formatCents(row.paymentCents)}</td>
                    <td className="py-0.5 pr-3 text-right">{formatCents(row.principalCents)}</td>
                    <td className="py-0.5 pr-3 text-right">{formatCents(row.interestCents)}</td>
                    <td className="py-0.5 text-right">{formatCents(row.balanceCents)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
