"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { parseCsvText, type ParseResult } from "@/lib/csv/parser";
import { stripCodeFence } from "@/lib/tax/csv";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaxCsvUploaderProps {
  onParsed: (result: ParseResult) => void;
}

export function TaxCsvUploader({ onParsed }: TaxCsvUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);

  function processText(text: string) {
    try {
      const result = parseCsvText(stripCodeFence(text));
      if (result.rows.length === 0) {
        setError("No rows found — check that the CSV has a header row plus at least one data row.");
        return;
      }
      setError(null);
      onParsed(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
    }
  }

  function processFile(file: File) {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv" && file.type !== "text/plain") {
      setError("Please upload a CSV file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => processText((e.target?.result as string) ?? "");
    reader.readAsText(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-1">3. Upload the CSV</p>
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
          )}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">
            Drag and drop a CSV file here, or click to browse
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            Choose File
          </Button>
          <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="csvPaste">Paste CSV text</Label>
        <textarea
          id="csvPaste"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder="Paste the CSV your AI tool returned, including the header row"
          className="w-full min-h-[120px] rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm font-mono outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button type="button" size="sm" disabled={!pasted.trim()} onClick={() => processText(pasted)}>
          Parse Pasted CSV
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
