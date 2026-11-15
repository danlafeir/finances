import type { StoredFileKind } from "@/generated/prisma/enums";
import { MAX_UPLOAD_BYTES, formatFileSize } from "@/lib/insurance/documents";

export const ALLOWED_EXTENSIONS: Record<StoredFileKind, string[]> = {
  IMPORT_CSV: [".csv"],
  STATEMENT: [".pdf", ".png", ".jpg", ".jpeg", ".csv"],
  TAX_FORM: [".pdf", ".png", ".jpg", ".jpeg", ".csv"],
};

export function acceptAttr(kind: StoredFileKind): string {
  return ALLOWED_EXTENSIONS[kind].join(",");
}

export function checkStoredFile(
  file: { name: string; size: number },
  kind: StoredFileKind
): string | null {
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_UPLOAD_BYTES) return `File is too large — max ${formatFileSize(MAX_UPLOAD_BYTES)}.`;
  const lower = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS[kind].some((ext) => lower.endsWith(ext))) {
    return `Only ${ALLOWED_EXTENSIONS[kind].join(", ")} files are supported here.`;
  }
  return null;
}
