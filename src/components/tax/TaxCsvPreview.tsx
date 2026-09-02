"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCents } from "@/lib/money";
import { eligibleAccountsFor, TAX_FORM_LABEL } from "@/lib/tax/forms";
import { commitTaxCsvRows, findDuplicateTaxRecords } from "@/actions/tax";
import type { TaxRecordInput } from "@/lib/schemas";
import type { TaxCsvDraftRow } from "@/lib/tax/csv";
import type { Account } from "@/generated/prisma/client";
import type { TaxFormType } from "@/generated/prisma/enums";
import { AlertTriangle } from "lucide-react";

interface TaxCsvPreviewProps {
  formType: TaxFormType;
  taxYear: number;
  rows: TaxCsvDraftRow[];
  accounts: Account[];
  onBack: () => void;
  onComplete: (imported: number, skipped: number) => void;
}

function buildRecordInput(
  formType: TaxFormType,
  taxYear: number,
  row: TaxCsvDraftRow,
  accountId: string
): TaxRecordInput {
  const base = { taxYear, payerName: row.payerName, accountId, notes: row.notes };

  if (formType === "FORM_1099_INT") {
    return {
      ...base,
      formType: "FORM_1099_INT",
      interestIncomeCents: row.fields.interestIncomeCents ?? 0,
      federalTaxWithheldCents: row.fields.federalTaxWithheldCents ?? null,
    };
  }
  if (formType === "FORM_1099_DIV_B") {
    return {
      ...base,
      formType: "FORM_1099_DIV_B",
      ordinaryDividendsCents: row.fields.ordinaryDividendsCents ?? null,
      qualifiedDividendsCents: row.fields.qualifiedDividendsCents ?? null,
      capitalGainDistributionsCents: row.fields.capitalGainDistributionsCents ?? null,
      shortTermCapitalGainCents: row.fields.shortTermCapitalGainCents ?? null,
      longTermCapitalGainCents: row.fields.longTermCapitalGainCents ?? null,
      federalTaxWithheldCents: row.fields.federalTaxWithheldCents ?? null,
    };
  }
  return {
    ...base,
    formType: "FORM_1098",
    mortgageInterestPaidCents: row.fields.mortgageInterestPaidCents ?? 0,
    outstandingPrincipalCents: row.fields.outstandingPrincipalCents ?? null,
  };
}

export function TaxCsvPreview({ formType, taxYear, rows, accounts, onBack, onComplete }: TaxCsvPreviewProps) {
  const eligibleAccounts = eligibleAccountsFor(formType, accounts);
  const [accountIds, setAccountIds] = useState<string[]>(
    rows.map(() => (eligibleAccounts.length === 1 ? eligibleAccounts[0].id : ""))
  );
  const [duplicates, setDuplicates] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const keys = rows
      .map((row, i) => ({ taxYear, formType, accountId: accountIds[i], payerName: row.payerName }))
      .filter((k) => k.accountId);

    if (keys.length === 0) return;

    findDuplicateTaxRecords(keys).then((found) => {
      setDuplicates(
        new Map(found.map((f) => [`${f.taxYear}|${f.formType}|${f.accountId}|${f.payerName}`, f.id]))
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(accountIds), rows, taxYear, formType]);

  function rowKey(row: TaxCsvDraftRow, accountId: string) {
    return `${taxYear}|${formType}|${accountId}|${row.payerName}`;
  }

  const allAssigned = rows.every((_, i) => accountIds[i]);
  const hasErrors = rows.some((r) => r.error);

  async function handleImport() {
    setLoading(true);
    setError(null);
    try {
      const inputs = rows.map((row, i) => buildRecordInput(formType, taxYear, row, accountIds[i]));
      const result = await commitTaxCsvRows(inputs);
      onComplete(result.imported, result.skipped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {rows.length} row{rows.length !== 1 ? "s" : ""} parsed for {TAX_FORM_LABEL[formType]}, {taxYear}.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} disabled={loading}>
            Back
          </Button>
          <Button onClick={handleImport} disabled={loading || !allAssigned || hasErrors}>
            {loading ? "Importing..." : `Import ${rows.length} Record${rows.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {eligibleAccounts.length === 0 && (
        <p className="text-sm text-destructive">
          No accounts of the eligible type exist yet for this form. Create one first.
        </p>
      )}

      <div className="border rounded-md divide-y">
        {rows.map((row, i) => {
          const dupId = accountIds[i] ? duplicates.get(rowKey(row, accountIds[i])) : undefined;
          return (
            <div key={i} className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-sm truncate">{row.payerName || "(missing payer name)"}</span>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
                  {Object.entries(row.fields).map(([key, value]) =>
                    value != null ? (
                      <span key={key}>{formatCents(value)}</span>
                    ) : null
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Select
                  value={accountIds[i]}
                  onValueChange={(v) => {
                    if (!v) return;
                    setAccountIds((prev) => prev.map((id, idx) => (idx === i ? v : id)));
                  }}
                >
                  <SelectTrigger className="w-56"><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {eligibleAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {row.error && (
                  <span className="flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    {row.error}
                  </span>
                )}

                {dupId && (
                  <span className="flex items-center gap-1 text-xs text-amber-600">
                    <AlertTriangle className="h-3 w-3" />
                    Already recorded — importing will skip this row.{" "}
                    <Link href={`/tax/${dupId}/edit`} className="underline">
                      Edit the existing record
                    </Link>{" "}
                    instead.
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
