"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CsvUploader } from "./CsvUploader";
import { ColumnMapper } from "./ColumnMapper";
import { ImportPreview, ImportSuccess } from "./ImportPreview";
import type { ParseResult } from "@/lib/csv/parser";
import type { ImportRow } from "@/actions/import";
import type { Account, Category } from "@/generated/prisma/client";

type Step = "upload" | "map" | "preview" | "done";

interface ImportWizardProps {
  accounts: Account[];
  categories: Category[];
  redirectTo?: string;
}

const STEP_LABELS: Record<Step, string> = {
  upload: "1. Upload",
  map: "2. Map Columns",
  preview: "3. Preview",
  done: "Done",
};

export function ImportWizard({ accounts, categories, redirectTo }: ImportWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [imported, setImported] = useState(0);
  const [skipped, setSkipped] = useState(0);

  const steps: Step[] = ["upload", "map", "preview"];

  return (
    <div className="space-y-6">
      <div className="flex gap-4 text-sm">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground">→</span>}
            <span
              className={
                step === s
                  ? "font-medium text-foreground"
                  : step === "done" || steps.indexOf(step) > i
                  ? "text-muted-foreground line-through"
                  : "text-muted-foreground"
              }
            >
              {STEP_LABELS[s]}
            </span>
          </div>
        ))}
      </div>

      {step === "upload" && (
        <CsvUploader
          onParsed={(result) => {
            setParseResult(result);
            setStep("map");
          }}
        />
      )}

      {step === "map" && parseResult && (
        <ColumnMapper
          parseResult={parseResult}
          accounts={accounts}
          categories={categories}
          onMapped={(rows) => {
            setImportRows(rows);
            setStep("preview");
          }}
        />
      )}

      {step === "preview" && (
        <ImportPreview
          rows={importRows}
          categories={categories}
          onBack={() => setStep("map")}
          onComplete={(imp, skip) => {
            setImported(imp);
            setSkipped(skip);
            setStep("done");
          }}
        />
      )}

      {step === "done" && (
        <ImportSuccess
          imported={imported}
          skipped={skipped}
          onDone={() => router.push(redirectTo ?? "/transactions")}
        />
      )}
    </div>
  );
}
