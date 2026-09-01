"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseCsvText, type ParseResult } from "@/lib/csv/parser";
import { Upload } from "lucide-react";

interface CsvUploaderProps {
  onParsed: (result: ParseResult) => void;
}

export function CsvUploader({ onParsed }: CsvUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function processFile(file: File) {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      setError("Please upload a CSV file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = parseCsvText(text);
        if (result.rows.length === 0) {
          setError("The CSV file appears to be empty.");
          return;
        }
        setError(null);
        onParsed(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse CSV");
      }
    };
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
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-3">
          Drag and drop a CSV file here, or click to browse
        </p>
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          Choose File
        </Button>
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
