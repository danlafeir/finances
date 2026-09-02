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
import { TaxPromptCard } from "@/components/tax/TaxPromptCard";
import { TaxCsvUploader } from "@/components/tax/TaxCsvUploader";
import { TaxCsvPreview } from "@/components/tax/TaxCsvPreview";
import { TaxCsvSuccess } from "@/components/tax/TaxCsvSuccess";
import { TAX_FORM_TYPES } from "@/lib/tax/forms";
import { TAX_CSV_TEMPLATES } from "@/lib/tax/csvTemplates";
import { missingTaxCsvHeaders, parseTaxCsvRows, type TaxCsvDraftRow } from "@/lib/tax/csv";
import type { ParseResult } from "@/lib/csv/parser";
import type { Account } from "@/generated/prisma/client";
import type { TaxFormType } from "@/generated/prisma/enums";

type Step = "setup" | "upload" | "review" | "done";

interface TaxCsvWizardProps {
  accounts: Account[];
  defaultFormType?: string;
}

function currentTaxYear(): number {
  return new Date().getFullYear() - 1;
}

export function TaxCsvWizard({ accounts, defaultFormType }: TaxCsvWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("setup");
  const [taxYear, setTaxYear] = useState(currentTaxYear());
  const [formType, setFormType] = useState<TaxFormType>(
    (defaultFormType as TaxFormType) ?? "FORM_1099_INT"
  );
  const [draftRows, setDraftRows] = useState<TaxCsvDraftRow[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imported, setImported] = useState(0);
  const [skipped, setSkipped] = useState(0);

  function handleParsed(result: ParseResult) {
    const missing = missingTaxCsvHeaders(formType, result.headers);
    if (missing.length > 0) {
      setUploadError(
        `Missing required column${missing.length !== 1 ? "s" : ""}: ${missing.join(", ")}. Check the CSV against the template above and try again.`
      );
      return;
    }
    setUploadError(null);
    setDraftRows(parseTaxCsvRows(formType, result.rows));
    setStep("review");
  }

  return (
    <div className="space-y-6">
      {step === "setup" && (
        <div className="space-y-4 max-w-md">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="csvTaxYear">Tax Year</Label>
              <Input
                id="csvTaxYear"
                type="number"
                value={taxYear}
                onChange={(e) => setTaxYear(parseInt(e.target.value, 10) || currentTaxYear())}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="csvFormType">Form Type</Label>
              <Select value={formType} onValueChange={(v) => { if (v) setFormType(v as TaxFormType); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TAX_FORM_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TaxPromptCard template={TAX_CSV_TEMPLATES[formType]} />

          <Button onClick={() => setStep("upload")}>Continue →</Button>
        </div>
      )}

      {step === "upload" && (
        <div className="space-y-4">
          <TaxCsvUploader onParsed={handleParsed} />
          {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
          <Button type="button" variant="outline" onClick={() => setStep("setup")}>
            ← Back
          </Button>
        </div>
      )}

      {step === "review" && (
        <TaxCsvPreview
          formType={formType}
          taxYear={taxYear}
          rows={draftRows}
          accounts={accounts}
          onBack={() => setStep("upload")}
          onComplete={(imp, skip) => {
            setImported(imp);
            setSkipped(skip);
            setStep("done");
          }}
        />
      )}

      {step === "done" && (
        <TaxCsvSuccess
          imported={imported}
          skipped={skipped}
          onDone={() => router.push(`/tax?year=${taxYear}`)}
        />
      )}
    </div>
  );
}
