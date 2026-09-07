import { z } from "zod";
import { InsuranceAnalysisInput } from "./schema";

/**
 * AI tools frequently wrap JSON output in a ```json ... ``` fence, or pad it with
 * prose ("Here's the analysis:\n{...}\nLet me know if...") despite being told not
 * to. Strip a fence if present; otherwise fall back to slicing from the first `{`
 * to the last `}`, since JSON is more prone to prose-wrapping than tax's flat CSV.
 */
export function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```[a-zA-Z]*\n([\s\S]*?)\n?```/);
  if (fenced) return fenced[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

export type ParsedAnalysis =
  | { ok: true; data: InsuranceAnalysisInput }
  | { ok: false; error: string };

/** Parses and validates a stored analysisJson row, tolerant of old/broken rows so a future schema tightening never crashes a render. */
export function parseStoredAnalysis(json: string): ParsedAnalysis {
  try {
    const parsed = JSON.parse(json);
    const result = InsuranceAnalysisInput.safeParse(parsed);
    if (!result.success) return { ok: false, error: "Stored analysis no longer matches the expected format." };
    return { ok: true, data: result.data };
  } catch {
    return { ok: false, error: "Stored analysis could not be read." };
  }
}

export interface FieldIssue {
  path: string;
  message: string;
}

export function mapZodIssues(issues: z.ZodIssue[]): FieldIssue[] {
  return issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}
