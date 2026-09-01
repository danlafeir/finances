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
import { createAccount, updateAccount } from "@/actions/accounts";
import { parseDollarsToCents, centsToDisplay } from "@/lib/money";
import type { Account } from "@/generated/prisma/client";

const ACCOUNT_TYPES = [
  { value: "CHECKING", label: "Checking" },
  { value: "CASH", label: "Cash" },
  { value: "QUALIFIED_BROKERAGE", label: "Qualified Brokerage" },
  { value: "TAXABLE_BROKERAGE", label: "Taxable Brokerage" },
  { value: "STOCK_PLAN", label: "Stock Plan" },
];

const BROKERS = [
  "Betterment",
  "Vanguard",
  "Fidelity",
  "Charles Schwab",
  "E*Trade",
  "Ally",
  "Northwestern Mutual",
];

interface AccountFormProps {
  account?: Account;
}

export function AccountForm({ account }: AccountFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isEdit = !!account;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const type = fd.get("type") as string;
    const broker = fd.get("broker") as string;
    const balanceStr = fd.get("openingBalance") as string;
    const color = fd.get("color") as string;

    try {
      const openingBalanceCents = parseDollarsToCents(balanceStr || "0");

      const data = {
        name,
        type: type as Parameters<typeof createAccount>[0]["type"],
        broker: broker || undefined,
        openingBalanceCents,
        isLiability: false,
        color: color || undefined,
        currency: "USD",
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
        <Select name="type" defaultValue={account?.type ?? "CHECKING"} required>
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
        <Label htmlFor="openingBalance">Opening Balance</Label>
        <Input
          id="openingBalance"
          name="openingBalance"
          type="text"
          inputMode="decimal"
          defaultValue={account ? centsToDisplay(account.openingBalanceCents) : "0.00"}
          placeholder="0.00"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="color">Color (optional)</Label>
        <Input
          id="color"
          name="color"
          type="color"
          defaultValue={account?.color ?? "#6366f1"}
          className="h-10 w-16 p-1"
        />
      </div>

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
