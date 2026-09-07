"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InsuranceAnalysisView } from "./InsuranceAnalysisView";
import { DeleteInsuranceAnalysisButton } from "./DeleteInsuranceAnalysisButton";
import type { ParsedAnalysis } from "@/lib/insurance/analysis";
import { ChevronDown, ChevronUp } from "lucide-react";

interface HistoryEntry {
  id: string;
  createdAt: Date;
  parsed: ParsedAnalysis;
}

export function InsuranceAnalysisHistory({ analyses }: { analyses: HistoryEntry[] }) {
  const [open, setOpen] = useState(false);

  if (analyses.length === 0) return null;

  return (
    <div className="space-y-3">
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {open ? "Hide" : "Show"} {analyses.length} earlier analys{analyses.length === 1 ? "is" : "es"}
      </Button>

      {open && (
        <div className="space-y-4">
          {analyses.map(({ id, createdAt, parsed }) => (
            <div key={id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </p>
                <DeleteInsuranceAnalysisButton id={id} />
              </div>
              {parsed.ok ? (
                <InsuranceAnalysisView analysis={parsed.data} />
              ) : (
                <p className="text-sm text-muted-foreground">{parsed.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
