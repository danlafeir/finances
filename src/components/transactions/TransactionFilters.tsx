"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { Account, Category } from "@/generated/prisma/client";

interface TransactionFiltersProps {
  accounts: Account[];
  categories: Category[];
}

export function TransactionFilters({ accounts, categories }: TransactionFiltersProps) {
  const router = useRouter();
  const sp = useSearchParams();

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/transactions?${params.toString()}`);
  }

  function clearAll() {
    router.push("/transactions");
  }

  const hasFilters = sp.get("account") || sp.get("category") || sp.get("type") || sp.get("from") || sp.get("to");

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Select value={sp.get("account") ?? ""} onValueChange={(v) => update("account", v || null)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All accounts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All accounts</SelectItem>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sp.get("category") ?? ""} onValueChange={(v) => update("category", v || null)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.icon} {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sp.get("type") ?? ""} onValueChange={(v) => update("type", v || null)}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All types</SelectItem>
          <SelectItem value="INCOME">Income</SelectItem>
          <SelectItem value="EXPENSE">Expense</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="date"
        className="w-36"
        value={sp.get("from") ?? ""}
        onChange={(e) => update("from", e.target.value || null)}
        placeholder="From"
      />
      <Input
        type="date"
        className="w-36"
        value={sp.get("to") ?? ""}
        onChange={(e) => update("to", e.target.value || null)}
        placeholder="To"
      />

      {hasFilters && (
        <Button size="sm" variant="ghost" onClick={clearAll}>
          <X className="h-3 w-3 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
