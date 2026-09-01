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
import { parseDollarsToCents, centsToDisplay, formatCents } from "@/lib/money";
import { ACCOUNT_TYPES, BROKERS, ACCOUNT_TYPE_COLOR } from "@/lib/accounts";
import type { Account, VestingEvent } from "@/generated/prisma/client";

interface EventRow {
  date: string;
  shares: string;
}

interface AccountFormProps {
  account?: Account;
  vestingEvents?: VestingEvent[];
}

export function AccountForm({ account, vestingEvents: initialEvents = [] }: AccountFormProps) {
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

  const isStockPlan = accountType === "STOCK_PLAN";
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

    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const broker = fd.get("broker") as string;
    const balanceStr = fd.get("openingBalance") as string;

    try {
      const openingBalanceCents = parseDollarsToCents(balanceStr || "0");

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
        openingBalanceCents,
        isLiability: accountType === "CREDIT_CARD",
        color: ACCOUNT_TYPE_COLOR[accountType],
        currency: "USD",
        vestingEvents: vestingEventsData,
      };

      if (isEdit) {
        await updateAccount(account.id, data);
      } else {
        await createAccount(data);
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
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
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

      <div className="space-y-1.5">
        <Label htmlFor="openingBalance">
          {isStockPlan ? "Unvested Amount" : "Current Balance"}
        </Label>
        <Input
          id="openingBalance"
          name="openingBalance"
          type="text"
          inputMode="decimal"
          defaultValue={account ? centsToDisplay(account.openingBalanceCents) : "0.00"}
          placeholder="0.00"
        />
      </div>

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
