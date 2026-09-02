"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { createHolding, updateHolding } from "@/actions/holdings";
import { parseDollarsToCents, centsToDisplay } from "@/lib/money";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { Account, Holding } from "@/generated/prisma/client";

interface HoldingFormProps {
  accounts: Account[];
  holding?: Holding;
  onDone: () => void;
}

export function HoldingForm({ accounts, holding, onDone }: HoldingFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const ticker = (fd.get("ticker") as string).toUpperCase().trim();
    const shares = parseFloat(fd.get("shares") as string);
    const costBasis = fd.get("costBasis") as string;
    const accountId = fd.get("accountId") as string;

    try {
      const costBasisCents = parseDollarsToCents(costBasis || "0");

      const data = { ticker, shares, costBasisCents, accountId };

      if (holding) {
        await updateHolding(holding.id, data);
      } else {
        await createHolding(data);
      }
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const brokerageAccounts = accounts.filter((a) =>
    a.type === "QUALIFIED_BROKERAGE" || a.type === "TAXABLE_BROKERAGE" || a.type === "STOCK_PLAN"
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="ticker">Ticker Symbol</Label>
        <Input
          id="ticker"
          name="ticker"
          required
          defaultValue={holding?.ticker ?? ""}
          placeholder="e.g. AAPL"
          className="uppercase"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="shares">Shares</Label>
        <Input
          id="shares"
          name="shares"
          type="number"
          step="any"
          required
          defaultValue={holding?.shares ?? ""}
          placeholder="0.00"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="costBasis">Total Cost Basis</Label>
        <CurrencyInput
          id="costBasis"
          name="costBasis"
          required
          defaultValue={holding ? centsToDisplay(holding.costBasisCents) : ""}
          placeholder="$0.00"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="accountId">Brokerage Account</Label>
        <Select name="accountId" defaultValue={holding?.accountId ?? brokerageAccounts[0]?.id ?? accounts[0]?.id} required>
          <SelectTrigger>
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : holding ? "Save Changes" : "Add Holding"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
