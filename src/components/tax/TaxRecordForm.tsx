"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTaxRecord, updateTaxRecord } from "@/actions/tax";
import { TaxRecordInput } from "@/lib/schemas";
import { parseDollarsToCents, centsToDisplay } from "@/lib/money";
import { TAX_FORM_TYPES, eligibleAccountsFor } from "@/lib/tax/forms";
import type { Account, TaxRecord } from "@/generated/prisma/client";

interface TaxRecordFormProps {
  accounts: Account[];
  record?: TaxRecord;
  defaultAccountId?: string;
  defaultFormType?: string;
}

function currentTaxYear(): number {
  return new Date().getFullYear() - 1;
}

export function TaxRecordForm({ accounts, record, defaultAccountId, defaultFormType }: TaxRecordFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formType, setFormType] = useState(record?.formType ?? defaultFormType ?? "FORM_1099_INT");
  const [accountId, setAccountId] = useState(record?.accountId ?? defaultAccountId ?? "");

  const isEdit = !!record;
  const isInt = formType === "FORM_1099_INT";
  const isDivB = formType === "FORM_1099_DIV_B";
  const is1098 = formType === "FORM_1098";
  const eligibleAccounts = eligibleAccountsFor(formType, accounts);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const taxYear = parseInt(fd.get("taxYear") as string, 10);
    const payerName = (fd.get("payerName") as string).trim();
    const notes = ((fd.get("notes") as string) || "").trim() || null;

    function centsOrNull(field: string): number | null {
      const raw = (fd.get(field) as string) || "";
      return raw.trim() ? parseDollarsToCents(raw) : null;
    }

    try {
      let data: TaxRecordInput;

      if (isInt) {
        data = {
          formType: "FORM_1099_INT",
          taxYear,
          payerName,
          accountId,
          notes,
          interestIncomeCents: parseDollarsToCents(fd.get("interestIncomeCents") as string),
          federalTaxWithheldCents: centsOrNull("federalTaxWithheldCents"),
        };
      } else if (isDivB) {
        data = {
          formType: "FORM_1099_DIV_B",
          taxYear,
          payerName,
          accountId,
          notes,
          ordinaryDividendsCents: centsOrNull("ordinaryDividendsCents"),
          qualifiedDividendsCents: centsOrNull("qualifiedDividendsCents"),
          capitalGainDistributionsCents: centsOrNull("capitalGainDistributionsCents"),
          shortTermCapitalGainCents: centsOrNull("shortTermCapitalGainCents"),
          longTermCapitalGainCents: centsOrNull("longTermCapitalGainCents"),
          federalTaxWithheldCents: centsOrNull("federalTaxWithheldCents"),
        };
      } else {
        data = {
          formType: "FORM_1098",
          taxYear,
          payerName,
          accountId,
          notes,
          mortgageInterestPaidCents: parseDollarsToCents(fd.get("mortgageInterestPaidCents") as string),
          outstandingPrincipalCents: centsOrNull("outstandingPrincipalCents"),
        };
      }

      const parsed = TaxRecordInput.parse(data);

      if (isEdit) {
        await updateTaxRecord(record.id, parsed);
      } else {
        await createTaxRecord(parsed);
      }

      router.push(`/tax?year=${taxYear}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="taxYear">Tax Year</Label>
          <Input
            id="taxYear"
            name="taxYear"
            type="number"
            required
            defaultValue={record?.taxYear ?? currentTaxYear()}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="formType">Form Type</Label>
          {isEdit ? (
            <div className="flex h-8 w-full items-center rounded-lg border bg-muted px-2.5 text-sm text-muted-foreground cursor-not-allowed">
              {TAX_FORM_TYPES.find((t) => t.value === formType)?.label ?? formType}
            </div>
          ) : (
            <Select value={formType} onValueChange={(v) => { if (v) { setFormType(v); setAccountId(""); } }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TAX_FORM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="payerName">{is1098 ? "Lender Name" : "Payer Name"}</Label>
        <Input
          id="payerName"
          name="payerName"
          required
          defaultValue={record?.payerName ?? ""}
          placeholder={is1098 ? "e.g. Rocket Mortgage" : "e.g. Charles Schwab"}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="accountId">Account</Label>
        <Select value={accountId} onValueChange={(v) => { if (v) setAccountId(v); }} required>
          <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
          <SelectContent>
            {eligibleAccounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {eligibleAccounts.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No eligible accounts for this form type yet.
          </p>
        )}
      </div>

      {isInt && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="interestIncomeCents">Interest Income</Label>
            <CurrencyInput
              id="interestIncomeCents"
              name="interestIncomeCents"
              required
              placeholder="$0.00"
              defaultValue={record?.interestIncomeCents != null ? centsToDisplay(record.interestIncomeCents) : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="federalTaxWithheldCents">Federal Tax Withheld</Label>
            <CurrencyInput
              id="federalTaxWithheldCents"
              name="federalTaxWithheldCents"
              placeholder="$0.00"
              defaultValue={record?.federalTaxWithheldCents != null ? centsToDisplay(record.federalTaxWithheldCents) : ""}
            />
          </div>
        </div>
      )}

      {isDivB && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ordinaryDividendsCents">Ordinary Dividends</Label>
            <CurrencyInput
              id="ordinaryDividendsCents"
              name="ordinaryDividendsCents"
              placeholder="$0.00"
              defaultValue={record?.ordinaryDividendsCents != null ? centsToDisplay(record.ordinaryDividendsCents) : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qualifiedDividendsCents">Qualified Dividends</Label>
            <CurrencyInput
              id="qualifiedDividendsCents"
              name="qualifiedDividendsCents"
              placeholder="$0.00"
              defaultValue={record?.qualifiedDividendsCents != null ? centsToDisplay(record.qualifiedDividendsCents) : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capitalGainDistributionsCents">Capital Gain Distributions</Label>
            <CurrencyInput
              id="capitalGainDistributionsCents"
              name="capitalGainDistributionsCents"
              placeholder="$0.00"
              defaultValue={record?.capitalGainDistributionsCents != null ? centsToDisplay(record.capitalGainDistributionsCents) : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="federalTaxWithheldCents">Federal Tax Withheld</Label>
            <CurrencyInput
              id="federalTaxWithheldCents"
              name="federalTaxWithheldCents"
              placeholder="$0.00"
              defaultValue={record?.federalTaxWithheldCents != null ? centsToDisplay(record.federalTaxWithheldCents) : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shortTermCapitalGainCents">Short-Term Capital Gain/Loss</Label>
            <CurrencyInput
              id="shortTermCapitalGainCents"
              name="shortTermCapitalGainCents"
              placeholder="$0.00 (use - for a loss)"
              defaultValue={record?.shortTermCapitalGainCents != null ? centsToDisplay(record.shortTermCapitalGainCents) : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="longTermCapitalGainCents">Long-Term Capital Gain/Loss</Label>
            <CurrencyInput
              id="longTermCapitalGainCents"
              name="longTermCapitalGainCents"
              placeholder="$0.00 (use - for a loss)"
              defaultValue={record?.longTermCapitalGainCents != null ? centsToDisplay(record.longTermCapitalGainCents) : ""}
            />
          </div>
        </div>
      )}

      {is1098 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="mortgageInterestPaidCents">Mortgage Interest Paid</Label>
            <CurrencyInput
              id="mortgageInterestPaidCents"
              name="mortgageInterestPaidCents"
              required
              placeholder="$0.00"
              defaultValue={record?.mortgageInterestPaidCents != null ? centsToDisplay(record.mortgageInterestPaidCents) : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="outstandingPrincipalCents">Outstanding Principal</Label>
            <CurrencyInput
              id="outstandingPrincipalCents"
              name="outstandingPrincipalCents"
              placeholder="$0.00"
              defaultValue={record?.outstandingPrincipalCents != null ? centsToDisplay(record.outstandingPrincipalCents) : ""}
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input id="notes" name="notes" defaultValue={record?.notes ?? ""} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading || !accountId}>
          {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Tax Record"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
