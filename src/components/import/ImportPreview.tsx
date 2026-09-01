"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCents } from "@/lib/money";
import { commitImport, type ImportRow } from "@/actions/import";
import type { Category } from "@/generated/prisma/client";
import { CheckCircle2 } from "lucide-react";

interface ImportPreviewProps {
  rows: ImportRow[];
  categories: Category[];
  onBack: () => void;
  onComplete: (imported: number, skipped: number) => void;
}

export function ImportPreview({ rows: initialRows, categories, onBack, onComplete }: ImportPreviewProps) {
  const [rows, setRows] = useState(initialRows);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateCategory(index: number, categoryId: string | null) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, categoryId } : r)));
  }

  async function handleImport() {
    setLoading(true);
    setError(null);
    try {
      const result = await commitImport(rows);
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
          {rows.length} transactions to import. You can set categories before importing.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} disabled={loading}>
            Back
          </Button>
          <Button onClick={handleImport} disabled={loading}>
            {loading ? "Importing..." : `Import ${rows.length} Transactions`}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="border rounded-md divide-y max-h-[60vh] overflow-y-auto">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="text-muted-foreground w-20 shrink-0 tabular-nums">
              {new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
            <span className="flex-1 min-w-0 truncate">{row.description}</span>
            <Badge variant={row.type === "INCOME" ? "outline" : "secondary"} className="shrink-0">
              {row.type === "INCOME" ? "+" : "-"}
              {formatCents(row.amountCents)}
            </Badge>
            <Select
              value={row.categoryId ?? ""}
              onValueChange={(v) => updateCategory(i, v || null)}
            >
              <SelectTrigger className="w-36 h-7 text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Uncategorized</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ImportSuccess({ imported, skipped, onDone }: { imported: number; skipped: number; onDone: () => void }) {
  return (
    <div className="text-center space-y-4 py-8">
      <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
      <div>
        <p className="text-lg font-medium">{imported} transactions imported</p>
        {skipped > 0 && (
          <p className="text-sm text-muted-foreground">{skipped} duplicates skipped</p>
        )}
      </div>
      <Button onClick={onDone}>Done</Button>
    </div>
  );
}
