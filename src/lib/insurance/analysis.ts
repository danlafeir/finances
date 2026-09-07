import { z } from "zod";
import { stripCodeFence } from "@/lib/tax/csv";
import { InsuranceAnalysisInput } from "./schema";

/**
 * Finds the index of the "}" that closes the "{" at `start`, tracking string
 * literals so a brace inside a quoted value (e.g. a description mentioning "{tag}")
 * doesn't throw off the depth count. Returns -1 if unbalanced.
 */
function findMatchingBrace(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * AI tools frequently wrap JSON output in a ```json ... ``` fence, or pad it with
 * prose ("Here's the analysis:\n{...}\nLet me know if...") despite being told not
 * to. Reuse tax's fence stripper (a no-op if there's no fence), then balance-match
 * from the first "{" to find its true closing brace — a naive slice to the text's
 * *last* "}" would overshoot past any brace appearing in trailing prose.
 */
export function extractJsonObject(text: string): string {
  const stripped = stripCodeFence(text);
  const start = stripped.indexOf("{");
  if (start === -1) return stripped;

  const end = findMatchingBrace(stripped, start);
  return end !== -1 ? stripped.slice(start, end + 1) : stripped;
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
