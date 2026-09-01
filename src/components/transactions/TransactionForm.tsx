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
import { createTransaction } from "@/actions/transactions";
import { parseDollarsToCents } from "@/lib/money";
import type { Account, Category } from "@/generated/prisma/client";

interface TransactionFormProps {
  accounts: Account[];
  categories: Category[];
  defaultAccountId?: string;
}

export function TransactionForm({ accounts, categories, defaultAccountId }: TransactionFormProps) {
  const router = useRouter();
  const [formType, setFormType] = useState<"INCOME" | "EXPENSE" | "TRANSFER">("EXPENSE");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const date = fd.get("date") as string;
    const description = fd.get("description") as string;
    const amountStr = fd.get("amount") as string;
    const accountId = fd.get("accountId") as string;
    const categoryId = fd.get("categoryId") as string | null;
    const destinationAccountId = fd.get("destinationAccountId") as string | null;
    const notes = fd.get("notes") as string | null;

    try {
      const amountCents = parseDollarsToCents(amountStr);

      if (formType === "TRANSFER") {
        if (!destinationAccountId) throw new Error("Destination account is required for transfers");
        await createTransaction({
          formType: "TRANSFER",
          date,
          description,
          amountCents,
          accountId,
          destinationAccountId,
          notes: notes || null,
          source: "MANUAL",
        });
      } else if (formType === "INCOME") {
        await createTransaction({
          formType: "INCOME",
          type: "INCOME",
          date,
          description,
          amountCents,
          accountId,
          categoryId: categoryId || null,
          notes: notes || null,
          source: "MANUAL",
        });
      } else {
        await createTransaction({
          formType: "EXPENSE",
          type: "EXPENSE",
          date,
          description,
          amountCents,
          accountId,
          categoryId: categoryId || null,
          notes: notes || null,
          source: "MANUAL",
        });
      }

      router.push("/transactions");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="space-y-1.5">
        <Label>Type</Label>
        <div className="flex gap-2">
          {(["EXPENSE", "INCOME", "TRANSFER"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFormType(t)}
              className={`flex-1 py-1.5 text-sm rounded-md border transition-colors ${
                formType === t
                  ? t === "INCOME"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : t === "EXPENSE"
                    ? "bg-destructive text-destructive-foreground border-destructive"
                    : "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted"
              }`}
            >
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" required defaultValue={today} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" required placeholder="e.g. Grocery run" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          name="amount"
          type="text"
          inputMode="decimal"
          required
          placeholder="0.00"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="accountId">{formType === "TRANSFER" ? "From Account" : "Account"}</Label>
        <Select name="accountId" defaultValue={defaultAccountId ?? accounts[0]?.id} required>
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

      {formType === "TRANSFER" && (
        <div className="space-y-1.5">
          <Label htmlFor="destinationAccountId">To Account</Label>
          <Select name="destinationAccountId" required>
            <SelectTrigger>
              <SelectValue placeholder="Select destination" />
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
      )}

      {formType !== "TRANSFER" && (
        <div className="space-y-1.5">
          <Label htmlFor="categoryId">Category</Label>
          <Select name="categoryId">
            <SelectTrigger>
              <SelectValue placeholder="Uncategorized" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" name="notes" placeholder="Optional notes" />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Add Transaction"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
