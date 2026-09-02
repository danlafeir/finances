"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TaxRecordForm } from "@/components/tax/TaxRecordForm";
import { TaxCsvWizard } from "@/components/tax/TaxCsvWizard";
import type { Account } from "@/generated/prisma/client";

interface TaxAddViewProps {
  accounts: Account[];
  defaultAccountId?: string;
  defaultFormType?: string;
}

type Mode = "manual" | "csv";

export function TaxAddView({ accounts, defaultAccountId, defaultFormType }: TaxAddViewProps) {
  const [mode, setMode] = useState<Mode>("manual");

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "manual" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("manual")}
        >
          Manual Entry
        </Button>
        <Button
          type="button"
          variant={mode === "csv" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("csv")}
        >
          Upload CSV (via your own AI tool)
        </Button>
      </div>

      {mode === "manual" ? (
        <TaxRecordForm
          accounts={accounts}
          defaultAccountId={defaultAccountId}
          defaultFormType={defaultFormType}
        />
      ) : (
        <TaxCsvWizard accounts={accounts} defaultFormType={defaultFormType} />
      )}
    </div>
  );
}
