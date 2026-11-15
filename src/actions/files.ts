"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { saveFile, deleteStoredFile } from "@/lib/files/storage";
import { checkStoredFile } from "@/lib/files/accept";
import { StoredFileKind } from "@/generated/prisma/enums";

export type SaveFileResult = { ok: true; duplicate: boolean } | { ok: false; error: string };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface StoreInput {
  kind: StoredFileKind;
  file: File;
  accountId: string | null;
  taxYear: number | null;
  asOfDate: string | null;
}

async function storeFile({ kind, file, accountId, taxYear, asOfDate }: StoreInput): Promise<SaveFileResult> {
  const problem = checkStoredFile(file, kind);
  if (problem) return { ok: false, error: problem };
  if (asOfDate && !DATE_RE.test(asOfDate)) return { ok: false, error: "Invalid date." };

  const account = accountId
    ? await prisma.account.findUnique({ where: { id: accountId }, select: { name: true } })
    : null;
  if (accountId && !account) return { ok: false, error: "Account not found." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  // Re-saving the same file (e.g. re-running an import) is a no-op, not a second copy.
  const existing = await prisma.storedFile.findFirst({ where: { sha256, kind, accountId, taxYear } });
  if (existing) return { ok: true, duplicate: true };

  const today = new Date().toISOString().slice(0, 10);
  const dir = account
    ? `accounts/${account.name}/${kind === "IMPORT_CSV" ? "imports" : "statements"}`
    : `tax/${taxYear ?? "other"}`;
  const relPath = await saveFile(dir, `${asOfDate ?? today}_${file.name}`, buffer);

  try {
    await prisma.storedFile.create({
      data: {
        kind,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: buffer.length,
        sha256,
        relPath,
        asOfDate: asOfDate ? new Date(`${asOfDate}T00:00:00.000Z`) : null,
        taxYear,
        accountId,
      },
    });
  } catch (err) {
    await deleteStoredFile(relPath);
    throw err;
  }

  revalidatePath("/data");
  if (accountId) revalidatePath(`/accounts/${accountId}`);
  return { ok: true, duplicate: false };
}

function field(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" && value !== "" ? value : null;
}

function parseKind(value: string | null, allowed: StoredFileKind[]): StoredFileKind | null {
  return allowed.find((k) => k === value) ?? null;
}

// Hard copy of a statement or imported CSV, filed under the account.
export async function saveAccountFile(formData: FormData): Promise<SaveFileResult> {
  const file = formData.get("file");
  const accountId = field(formData, "accountId");
  const kind = parseKind(field(formData, "kind"), ["IMPORT_CSV", "STATEMENT"]);
  if (!(file instanceof File)) return { ok: false, error: "No file was provided." };
  if (!accountId || !kind) return { ok: false, error: "Missing account or file kind." };

  return storeFile({ kind, file, accountId, taxYear: null, asOfDate: field(formData, "asOfDate") });
}

// Hard copy of a 1099/1098 (or similar), filed by tax year, optionally tied to an account.
export async function saveTaxFile(formData: FormData): Promise<SaveFileResult> {
  const file = formData.get("file");
  const taxYear = Number(field(formData, "taxYear"));
  if (!(file instanceof File)) return { ok: false, error: "No file was provided." };
  if (!Number.isInteger(taxYear) || taxYear < 2000 || taxYear > 2100) return { ok: false, error: "Invalid tax year." };

  return storeFile({
    kind: "TAX_FORM",
    file,
    accountId: field(formData, "accountId"),
    taxYear,
    asOfDate: null,
  });
}

export async function deleteSavedFile(id: string) {
  const file = await prisma.storedFile.findUniqueOrThrow({ where: { id }, select: { relPath: true, accountId: true } });
  await prisma.storedFile.delete({ where: { id } });
  await deleteStoredFile(file.relPath);
  revalidatePath("/data");
  if (file.accountId) revalidatePath(`/accounts/${file.accountId}`);
}
