"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface TaxCsvSuccessProps {
  imported: number;
  skipped: number;
  onDone: () => void;
}

export function TaxCsvSuccess({ imported, skipped, onDone }: TaxCsvSuccessProps) {
  return (
    <div className="text-center space-y-4 py-8">
      <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
      <div>
        <p className="text-lg font-medium">{imported} tax record{imported !== 1 ? "s" : ""} imported</p>
        {skipped > 0 && (
          <p className="text-sm text-muted-foreground">{skipped} duplicate{skipped !== 1 ? "s" : ""} skipped</p>
        )}
      </div>
      <Button onClick={onDone}>Done</Button>
    </div>
  );
}
