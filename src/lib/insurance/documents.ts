export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const ACCEPTED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
const ACCEPTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg"];

export interface FileLike {
  name: string;
  type: string;
  size: number;
}

export function isAcceptedFile(file: FileLike): { ok: boolean; error?: string } {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `File is too large — max ${formatFileSize(MAX_UPLOAD_BYTES)}.` };
  }

  const lowerName = file.name.toLowerCase();
  const extensionOk = ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const mimeOk = file.type ? ACCEPTED_MIME_TYPES.includes(file.type) : false;

  if (!mimeOk && !extensionOk) {
    return { ok: false, error: "Only PDF, PNG, and JPG files are supported." };
  }

  return { ok: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
