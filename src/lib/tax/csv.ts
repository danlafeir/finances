import type { TaxFormType } from "@/generated/prisma/enums";
import type { ParsedRow } from "@/lib/csv/parser";
import { parseDollarsToCents } from "@/lib/money";
import { TAX_CSV_TEMPLATES } from "./csvTemplates";

/**
 * AI tools frequently wrap CSV output in a ```csv ... ``` fence despite being told
 * not to, often with prose before/after it (e.g. "Here's the CSV:\n```csv\n...\n```").
 * Extract the first fenced block found anywhere in the text; if there is none,
 * fall back to the text as-is.
 */
export function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```[a-zA-Z]*\n([\s\S]*?)\n?```/);
  return fenced ? fenced[1].trim() : trimmed;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

export function missingTaxCsvHeaders(formType: TaxFormType, headers: string[]): string[] {
  const have = new Set(headers.map(normalizeHeader));
  return TAX_CSV_TEMPLATES[formType].fields
    .filter((f) => f.required)
    .map((f) => f.header)
    .filter((header) => !have.has(normalizeHeader(header)));
}

export interface TaxCsvDraftRow {
  payerName: string;
  fields: Record<string, number | null>;
  notes: string | null;
  error: string | null;
}

export function parseTaxCsvRows(formType: TaxFormType, rows: ParsedRow[]): TaxCsvDraftRow[] {
  const template = TAX_CSV_TEMPLATES[formType];

  return rows.map((row) => {
    const normalizedRow = new Map(
      Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
    );

    let payerName = "";
    let notes: string | null = null;
    const fields: Record<string, number | null> = {};
    let error: string | null = null;

    for (const field of template.fields) {
      const raw = normalizedRow.get(normalizeHeader(field.header))?.trim() ?? "";

      if (field.kind === "payerName") {
        payerName = raw;
        if (field.required && !payerName) {
          error = error ?? `Missing ${field.header}`;
        }
        continue;
      }

      if (field.kind === "notes") {
        notes = raw || null;
        continue;
      }

      if (!raw) {
        fields[field.key] = null;
        if (field.required) {
          error = error ?? `Missing ${field.header}`;
        }
        continue;
      }

      try {
        fields[field.key] = parseDollarsToCents(raw);
      } catch {
        fields[field.key] = null;
        error = error ?? `Could not read "${raw}" as a dollar amount for ${field.header}`;
      }
    }

    return { payerName, fields, notes, error };
  });
}
