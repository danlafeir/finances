"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CsvUploader } from "./CsvUploader";
import { ColumnMapper } from "./ColumnMapper";
import { ImportPreview, ImportSuccess } from "./ImportPreview";
import type { ParseResult } from "@/lib/csv/parser";
import type { ImportRow } from "@/actions/import";
import { saveAccountFile } from "@/actions/files";
import type { Account } from "@/generated/prisma/client";

type Step = "upload" | "map" | "preview" | "done";

interface ImportWizardProps {
  accounts: Account[];
  redirectTo?: string;
}

const STEP_LABELS: Record<Step, string> = {
  upload: "1. Upload",
  map: "2. Map Columns",
  preview: "3. Preview",
  done: "Done",
};

export function ImportWizard({ accounts, redirectTo }: ImportWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
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
          onParsed={(result, file) => {
            setParseResult(result);
            setCsvFile(file);
            setStep("map");
          }}
        />
      )}

      {step === "map" && parseResult && (
        <ColumnMapper
          parseResult={parseResult}
          accounts={accounts}
          onMapped={(rows) => {
            setImportRows(rows);
            setStep("preview");
          }}
        />
      )}

      {step === "preview" && (
        <ImportPreview
          rows={importRows}
          onBack={() => setStep("map")}
          onComplete={async (imp, skip) => {
            setImported(imp);
            setSkipped(skip);
            // The import has already committed; a failed hard copy shouldn't undo
            // it, so report the problem on the success screen instead.
            const accountId = importRows[0]?.accountId;
            if (csvFile && accountId) {
              const fd = new FormData();
              fd.set("file", csvFile);
              fd.set("accountId", accountId);
              fd.set("kind", "IMPORT_CSV");
              try {
                const saved = await saveAccountFile(fd);
                if (!saved.ok) setFileError(saved.error);
              } catch (err) {
                setFileError(err instanceof Error ? err.message : "Couldn't save a copy of the CSV");
              }
            }
            setStep("done");
          }}
        />
      )}

      {step === "done" && fileError && (
        <p className="text-sm text-destructive">Imported, but the original CSV wasn&apos;t saved: {fileError}</p>
      )}

      {step === "done" && (
        <ImportSuccess
          imported={imported}
          skipped={skipped}
          onDone={() => router.push(redirectTo ?? "/accounts")}
        />
      )}
    </div>
  );
}
