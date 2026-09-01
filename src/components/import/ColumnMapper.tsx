"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BANK_PRESETS, parseDate, parseAmount } from "@/lib/csv/mappings";
import type { BankPreset } from "@/lib/csv/mappings";
import type { Account, Category } from "@/generated/prisma/client";
import type { ParseResult } from "@/lib/csv/parser";
import type { ImportRow } from "@/actions/import";

export interface ColumnMapping {
  dateCol: string;
  descriptionCol: string;
  amountCol: string;
  debitAmountCol?: string;
  creditAmountCol?: string;
  idCol?: string;
  accountId: string;
  defaultCategoryId?: string;
}

interface ColumnMapperProps {
  parseResult: ParseResult;
  accounts: Account[];
  categories: Category[];
  onMapped: (rows: ImportRow[], mapping: ColumnMapping) => void;
}

export function ColumnMapper({ parseResult, accounts, categories, onMapped }: ColumnMapperProps) {
  const { headers, rows } = parseResult;
  const [mapping, setMapping] = useState<ColumnMapping>({
    dateCol: headers[0] ?? "",
    descriptionCol: headers[1] ?? "",
    amountCol: headers[2] ?? "",
    accountId: accounts[0]?.id ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [useDebitCredit, setUseDebitCredit] = useState(false);

  function applyPreset(preset: BankPreset) {
    const has = (col: string) => headers.includes(col);
    setUseDebitCredit(!!(preset.debitAmountColumn && preset.creditAmountColumn));
    setMapping((prev) => ({
      ...prev,
      dateCol: has(preset.dateColumn) ? preset.dateColumn : prev.dateCol,
      descriptionCol: has(preset.descriptionColumn) ? preset.descriptionColumn : prev.descriptionCol,
      amountCol: preset.amountColumn && has(preset.amountColumn) ? preset.amountColumn : prev.amountCol,
      debitAmountCol: preset.debitAmountColumn && has(preset.debitAmountColumn) ? preset.debitAmountColumn : undefined,
      creditAmountCol: preset.creditAmountColumn && has(preset.creditAmountColumn) ? preset.creditAmountColumn : undefined,
      idCol: preset.idColumn && has(preset.idColumn) ? preset.idColumn : undefined,
    }));
  }

  function buildRows(): ImportRow[] {
    return rows.map((row) => {
      const dateStr = row[mapping.dateCol] ?? "";
      const description = (row[mapping.descriptionCol] ?? "").trim();
      const extId = mapping.idCol ? (row[mapping.idCol] ?? "").trim() : undefined;

      const date = parseDate(dateStr).toISOString().split("T")[0];

      let amountCents: number;
      let type: "INCOME" | "EXPENSE";

      if (useDebitCredit && mapping.debitAmountCol && mapping.creditAmountCol) {
        const debitStr = (row[mapping.debitAmountCol!] ?? "").trim();
        const creditStr = (row[mapping.creditAmountCol!] ?? "").trim();
        if (debitStr) {
          const { cents } = parseAmount(debitStr);
          amountCents = cents;
          type = "EXPENSE";
        } else {
          const { cents } = parseAmount(creditStr);
          amountCents = cents;
          type = "INCOME";
        }
      } else {
        const { cents, isDebit } = parseAmount(row[mapping.amountCol] ?? "0");
        amountCents = cents;
        type = isDebit ? "EXPENSE" : "INCOME";
      }

      return {
        date,
        description: description || "(no description)",
        amountCents,
        type,
        accountId: mapping.accountId,
        categoryId: mapping.defaultCategoryId ?? null,
        externalId: extId || null,
      };
    });
  }

  function handleApply() {
    try {
      const importRows = buildRows();
      setError(null);
      onMapped(importRows, mapping);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to map columns");
    }
  }

  const preview = rows.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <Label className="mb-2 block">Bank Preset</Label>
        <div className="flex flex-wrap gap-2">
          {BANK_PRESETS.map((p) => (
            <Button
              key={p.name}
              size="sm"
              variant="outline"
              type="button"
              onClick={() => applyPreset(p)}
            >
              {p.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Account</Label>
          <Select
            value={mapping.accountId}
            onValueChange={(v) => { if (v) setMapping((m) => ({ ...m, accountId: v })); }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Default Category</Label>
          <Select
            value={mapping.defaultCategoryId ?? ""}
            onValueChange={(v) => setMapping((m) => ({ ...m, defaultCategoryId: v || undefined }))}
          >
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Date Column</Label>
          <Select
            value={mapping.dateCol}
            onValueChange={(v) => { if (v) setMapping((m) => ({ ...m, dateCol: v })); }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Description Column</Label>
          <Select
            value={mapping.descriptionCol}
            onValueChange={(v) => { if (v) setMapping((m) => ({ ...m, descriptionCol: v })); }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="useDebitCredit"
            checked={useDebitCredit}
            onChange={(e) => setUseDebitCredit(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="useDebitCredit">Separate debit/credit columns</Label>
        </div>

        {useDebitCredit ? (
          <>
            <div className="space-y-1.5">
              <Label>Debit Column</Label>
              <Select
                value={mapping.debitAmountCol ?? ""}
                onValueChange={(v) => setMapping((m) => ({ ...m, debitAmountCol: v || undefined }))}
              >
                <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                <SelectContent>
                  {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Credit Column</Label>
              <Select
                value={mapping.creditAmountCol ?? ""}
                onValueChange={(v) => setMapping((m) => ({ ...m, creditAmountCol: v || undefined }))}
              >
                <SelectTrigger><SelectValue placeholder="Select column" /></SelectTrigger>
                <SelectContent>
                  {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <Label>Amount Column</Label>
            <Select
              value={mapping.amountCol}
              onValueChange={(v) => { if (v) setMapping((m) => ({ ...m, amountCol: v })); }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Preview (first 3 rows)</p>
        <div className="overflow-x-auto border rounded-md">
          <table className="text-xs w-full">
            <thead className="bg-muted/50">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-3 py-1.5 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className="border-t">
                  {headers.map((h) => (
                    <td key={h} className="px-3 py-1.5 text-muted-foreground">{row[h] ?? ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleApply}>Preview Transactions →</Button>
    </div>
  );
}
