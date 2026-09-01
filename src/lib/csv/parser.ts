import Papa from "papaparse";

export interface ParsedRow {
  [key: string]: string;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  errors: string[];
}

export function parseCsvText(text: string): ParseResult {
  const result = Papa.parse<ParsedRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  return {
    headers: result.meta.fields ?? [],
    rows: result.data,
    errors: result.errors.map((e) => e.message),
  };
}
