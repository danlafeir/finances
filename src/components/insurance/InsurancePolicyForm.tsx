"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
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
import { createInsurancePolicy, updateInsurancePolicy } from "@/actions/insurance";
import { InsurancePolicyInput } from "@/lib/schemas";
import { mapZodIssues } from "@/lib/insurance/analysis";
import { parseDollarsToCents, centsToDisplay } from "@/lib/money";
import { INSURANCE_POLICY_TYPES } from "@/lib/insurance/types";
import type { InsurancePolicy } from "@/generated/prisma/client";

interface InsurancePolicyFormProps {
  record?: InsurancePolicy;
}

const PREMIUM_FREQUENCIES = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "SEMI_ANNUAL", label: "Semi-Annual" },
  { value: "ANNUAL", label: "Annual" },
  { value: "OTHER", label: "Other" },
];

export function InsurancePolicyForm({ record }: InsurancePolicyFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState(record?.type ?? "AUTO");
  const [premiumFrequency, setPremiumFrequency] = useState(record?.premiumFrequency ?? "ANNUAL");

  const isEdit = !!record;
  const isOther = type === "OTHER";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const trimmedOrNull = (field: string) => ((fd.get(field) as string) || "").trim() || null;
    const premiumRaw = ((fd.get("premiumCents") as string) || "").trim();

    try {
      const data: InsurancePolicyInput = {
        type,
        typeOtherLabel: trimmedOrNull("typeOtherLabel"),
        nickname: trimmedOrNull("nickname"),
        insurer: (fd.get("insurer") as string).trim(),
        policyNumber: trimmedOrNull("policyNumber"),
        namedInsureds: trimmedOrNull("namedInsureds"),
        effectiveDate: trimmedOrNull("effectiveDate"),
        expirationDate: trimmedOrNull("expirationDate"),
        premiumCents: premiumRaw ? parseDollarsToCents(premiumRaw) : null,
        premiumFrequency: premiumRaw ? premiumFrequency : null,
        notes: trimmedOrNull("notes"),
      };

      const parsed = InsurancePolicyInput.parse(data);

      const saved = isEdit
        ? await updateInsurancePolicy(record.id, parsed)
        : await createInsurancePolicy(parsed);

      router.push(`/insurance/${saved.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(mapZodIssues(err.issues).map((i) => i.message).join("; "));
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="type">Policy Type</Label>
          <Select value={type} onValueChange={(v) => { if (v) setType(v as typeof type); }}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {INSURANCE_POLICY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nickname">Nickname <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input id="nickname" name="nickname" defaultValue={record?.nickname ?? ""} placeholder="e.g. Honda Civic" />
        </div>
      </div>

      {isOther && (
        <div className="space-y-1.5">
          <Label htmlFor="typeOtherLabel">Describe the policy type</Label>
          <Input
            id="typeOtherLabel"
            name="typeOtherLabel"
            required
            defaultValue={record?.typeOtherLabel ?? ""}
            placeholder="e.g. Boat, Jewelry Floater"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="insurer">Insurer</Label>
        <Input id="insurer" name="insurer" required defaultValue={record?.insurer ?? ""} placeholder="e.g. State Farm" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="policyNumber">Policy Number <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input id="policyNumber" name="policyNumber" defaultValue={record?.policyNumber ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="namedInsureds">Named Insureds <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input id="namedInsureds" name="namedInsureds" defaultValue={record?.namedInsureds ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="effectiveDate">Effective Date <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input
            id="effectiveDate"
            name="effectiveDate"
            type="date"
            defaultValue={record?.effectiveDate ? record.effectiveDate.toISOString().slice(0, 10) : ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expirationDate">Expiration Date <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input
            id="expirationDate"
            name="expirationDate"
            type="date"
            defaultValue={record?.expirationDate ? record.expirationDate.toISOString().slice(0, 10) : ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="premiumCents">Premium <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <CurrencyInput
            id="premiumCents"
            name="premiumCents"
            placeholder="$0.00"
            defaultValue={record?.premiumCents != null ? centsToDisplay(record.premiumCents) : ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="premiumFrequency">Billed</Label>
          <Select value={premiumFrequency} onValueChange={(v) => { if (v) setPremiumFrequency(v as typeof premiumFrequency); }}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PREMIUM_FREQUENCIES.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <textarea
          id="notes"
          name="notes"
          defaultValue={record?.notes ?? ""}
          className="w-full min-h-[80px] rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Policy"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
