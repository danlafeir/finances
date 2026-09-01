"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { TransactionType, TransactionSource } from "@/generated/prisma/enums";
import { createHash } from "crypto";

export interface ImportRow {
  date: string;
  description: string;
  amountCents: number;
  type: "INCOME" | "EXPENSE";
  accountId: string;
  categoryId?: string | null;
  externalId?: string | null;
}

export async function commitImport(rows: ImportRow[]): Promise<{ imported: number; skipped: number }> {
  if (rows.length === 0) return { imported: 0, skipped: 0 };

  const accountId = rows[0].accountId;

  // Generate externalId for rows that don't have one (dedup hash)
  const rowsWithIds = rows.map((r) => {
    const extId =
      r.externalId?.trim() ||
      createHash("sha256")
        .update(`${r.date}|${r.description}|${r.amountCents}`)
        .digest("hex")
        .slice(0, 32);
    return { ...r, externalId: extId };
  });

  // Fetch existing externalIds for this account to avoid duplicates
  const existingExtIds = await prisma.transaction.findMany({
    where: {
      accountId,
      externalId: { in: rowsWithIds.map((r) => r.externalId!).filter(Boolean) },
    },
    select: { externalId: true },
  });

  const existingSet = new Set(existingExtIds.map((t) => t.externalId).filter(Boolean));

  const toInsert = rowsWithIds.filter((r) => !existingSet.has(r.externalId ?? ""));
  const skipped = rowsWithIds.length - toInsert.length;

  if (toInsert.length > 0) {
    await prisma.transaction.createMany({
      data: toInsert.map((r) => ({
        date: new Date(r.date),
        description: r.description,
        amountCents: r.amountCents,
        type: r.type as TransactionType,
        source: TransactionSource.CSV,
        accountId: r.accountId,
        categoryId: r.categoryId ?? null,
        externalId: r.externalId ?? null,
      })),
    });
  }

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${accountId}`);
  revalidatePath("/spending");
  revalidatePath("/dashboard");

  return { imported: toInsert.length, skipped };
}
