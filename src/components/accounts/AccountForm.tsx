"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAccount, updateAccount, lookupTickerPrice } from "@/actions/accounts";
import { saveMortgageDetails } from "@/actions/mortgage";
import { parseDollarsToCents, centsToDisplay, formatCents } from "@/lib/money";
import { ACCOUNT_TYPES, BROKERS, ACCOUNT_TYPE_COLOR, LIABILITY_TYPES } from "@/lib/accounts";
import { MortgageFields } from "@/components/accounts/MortgageFields";
import type { Account, VestingEvent, MortgageDetails, MortgagePayment } from "@/generated/prisma/client";
import type { MortgageData } from "@/lib/mortgage";

interface EventRow {
  date: string;
  shares: string;
}

type MortgageInitial = MortgageDetails & { payments: MortgagePayment[] };

interface AccountFormProps {
  account?: Account;
  vestingEvents?: VestingEvent[];
  mortgageDetails?: MortgageInitial;
}

export function AccountForm({ account, vestingEvents: initialEvents = [], mortgageDetails }: AccountFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState(account?.type ?? "CHECKING");
  const [ticker, setTicker] = useState(account?.ticker ?? "");
  const [priceCents, setPriceCents] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [events, setEvents] = useState<EventRow[]>(
    initialEvents.map((e) => ({
      date: new Date(e.date).toISOString().slice(0, 10),
      shares: String(e.shares),
    }))
  );

  const [mortgageData, setMortgageData] = useState<MortgageData | null>(null);
  const [mortgageValid, setMortgageValid] = useState(false);

  const isStockPlan = accountType === "STOCK_PLAN";
  const isMortgage = accountType === "MORTGAGE";
  const isEdit = !!account;

  // Pre-fetch price when editing an existing stock plan account
  useEffect(() => {
    if (isStockPlan && account?.ticker) {
      lookupTickerPrice(account.ticker).then((p) => { if (p) setPriceCents(p); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchPrice() {
    if (!ticker.trim()) return;
    setPriceLoading(true);
    try {
      const price = await lookupTickerPrice(ticker.trim());
      setPriceCents(price);
    } finally {
      setPriceLoading(false);
    }
  }

  function addEvent() {
    setEvents((prev) => [...prev, { date: "", shares: "" }]);
  }

  function removeEvent(idx: number) {
    setEvents((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateEvent(idx: number, field: keyof EventRow, value: string) {
    setEvents((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  }

  function eventValueCents(shares: string): number | null {
    const n = parseFloat(shares);
    if (isNaN(n) || n <= 0 || priceCents === null) return null;
    return Math.round(n * priceCents);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isMortgage && !mortgageValid) {
      setError("Please fix the mortgage details before saving.");
      setLoading(false);
      return;
    }

    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const broker = fd.get("broker") as string;
    const balanceStr = fd.get("snapshotBalance") as string;
    const snapshotDateStr = fd.get("snapshotDate") as string;

    try {
      const snapshotBalanceCents = isMortgage
        ? (mortgageData?.currentBalanceCents ?? 0)
        : parseDollarsToCents(balanceStr || "0");

      const vestingEventsData = isStockPlan
        ? events
            .filter((e) => e.date && e.shares && parseFloat(e.shares) > 0)
            .map((e) => ({ date: e.date, shares: parseFloat(e.shares) }))
        : [];

      const data = {
        name,
        type: accountType as Parameters<typeof createAccount>[0]["type"],
        broker: broker || undefined,
        ticker: isStockPlan ? ticker.trim().toUpperCase() || undefined : undefined,
        snapshotBalanceCents,
        snapshotDate: snapshotDateStr || null,
        isLiability: LIABILITY_TYPES.has(accountType),
        color: ACCOUNT_TYPE_COLOR[accountType],
        currency: "USD",
        vestingEvents: vestingEventsData,
      };

      let accountId: string;
      if (isEdit) {
        await updateAccount(account.id, data);
        accountId = account.id;
      } else {
        const created = await createAccount(data);
        accountId = created.id;
      }

      if (isMortgage && mortgageData) {
        await saveMortgageDetails(accountId, mortgageData);
      }

      router.push("/accounts");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-4 ${isMortgage ? "max-w-5xl mx-auto" : "max-w-md"}`}
    >
      <div className={isMortgage ? "grid grid-cols-3 gap-4" : "space-y-4"}>
        <div className="space-y-1.5">
          <Label htmlFor="name">Account Name</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={account?.name ?? ""}
            placeholder="e.g. Chase Checking"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="type">Account Type</Label>
          {isEdit ? (
            <div className="flex h-9 w-full items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground cursor-not-allowed">
              {ACCOUNT_TYPES.find((t) => t.value === accountType)?.label ?? accountType}
            </div>
          ) : (
            <Select value={accountType} onValueChange={(v) => v && setAccountType(v as typeof accountType)} required>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="broker">Broker (optional)</Label>
          <Select name="broker" defaultValue={account?.broker ?? ""}>
            <SelectTrigger>
              <SelectValue placeholder="Select broker" />
            </SelectTrigger>
            <SelectContent>
              {BROKERS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isMortgage ? (
        <MortgageFields
          initial={
            mortgageDetails
              ? {
                  homeValueCents: mortgageDetails.homeValueCents,
                  principalCents: mortgageDetails.principalCents,
                  annualRateBps: mortgageDetails.annualRateBps,
                  termMonths: mortgageDetails.termMonths,
                  monthlyPaymentCents: mortgageDetails.monthlyPaymentCents,
                  firstPaymentDate: new Date(mortgageDetails.firstPaymentDate)
                    .toISOString()
                    .slice(0, 10),
                  payments: mortgageDetails.payments.map((p) => ({
                    paymentNumber: p.paymentNumber,
                    paymentDate: new Date(p.paymentDate).toISOString().slice(0, 10),
                    paymentCents: p.paymentCents,
                    principalCents: p.principalCents,
                    interestCents: p.interestCents,
                    balanceCents: p.balanceCents,
                  })),
                }
              : undefined
          }
          onChange={(data, valid) => {
            setMortgageData(data);
            setMortgageValid(valid);
          }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="snapshotBalance">
              {isStockPlan ? "Unvested Amount" : "Balance"}
            </Label>
            <Input
              id="snapshotBalance"
              name="snapshotBalance"
              type="text"
              inputMode="decimal"
              defaultValue={account ? centsToDisplay(account.snapshotBalanceCents) : "0.00"}
              placeholder="0.00"
            />
          </div>
          {!isStockPlan && (
            <div className="space-y-1.5">
              <Label htmlFor="snapshotDate">As of Date <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="snapshotDate"
                name="snapshotDate"
                type="date"
                defaultValue={
                  account?.snapshotDate
                    ? new Date(account.snapshotDate).toISOString().slice(0, 10)
                    : ""
                }
              />
            </div>
          )}
        </div>
      )}

      {isStockPlan && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="ticker">Stock Ticker</Label>
            <Input
              id="ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onBlur={fetchPrice}
              placeholder="e.g. AAPL"
            />
            {priceLoading && (
              <p className="text-xs text-muted-foreground">Fetching price…</p>
            )}
            {!priceLoading && priceCents !== null && (
              <p className="text-xs text-muted-foreground">
                Current price: {formatCents(priceCents)} / share
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Vesting Events</Label>
              <Button type="button" variant="outline" size="sm" onClick={addEvent}>
                <Plus className="h-3 w-3 mr-1" />
                Add Event
              </Button>
            </div>

            {events.length === 0 && (
              <p className="text-sm text-muted-foreground">No vesting events added.</p>
            )}

            {events.map((event, idx) => {
              const val = eventValueCents(event.shares);
              return (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    type="date"
                    value={event.date}
                    onChange={(e) => updateEvent(idx, "date", e.target.value)}
                    className="flex-1 min-w-0"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={event.shares}
                    onChange={(e) => updateEvent(idx, "shares", e.target.value)}
                    placeholder="Shares"
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground tabular-nums w-24 text-right shrink-0">
                    {val !== null ? formatCents(val) : ""}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEvent(idx)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Account"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
