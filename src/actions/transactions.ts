"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { TransactionType, TransactionSource } from "@/generated/prisma/enums";
import { CreateTransactionInput } from "@/lib/schemas";

export async function createTransaction(data: CreateTransactionInput) {
  const parsed = CreateTransactionInput.parse(data);

  if (parsed.formType === "TRANSFER") {
    const { destinationAccountId, amountCents, date, description, notes, source } = parsed;

    const transferPairId = crypto.randomUUID();
    const dateObj = new Date(date);

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          date: dateObj,
          description,
          amountCents,
          type: TransactionType.EXPENSE,
          source,
          transferPairId,
          notes: notes ?? null,
          accountId: parsed.accountId,
          categoryId: null,
        },
      }),
      prisma.transaction.create({
        data: {
          date: dateObj,
          description,
          amountCents,
          type: TransactionType.INCOME,
          source,
          transferPairId,
          notes: notes ?? null,
          accountId: destinationAccountId,
          categoryId: null,
        },
      }),
    ]);
  } else {
    await prisma.transaction.create({
      data: {
        date: new Date(parsed.date),
        description: parsed.description,
        amountCents: parsed.amountCents,
        type: parsed.type,
        source: parsed.source,
        notes: parsed.notes ?? null,
        accountId: parsed.accountId,
        categoryId: parsed.categoryId ?? null,
      },
    });
  }

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function deleteTransaction(id: string) {
  const tx = await prisma.transaction.findUniqueOrThrow({ where: { id } });

  if (tx.transferPairId) {
    await prisma.transaction.deleteMany({ where: { transferPairId: tx.transferPairId } });
  } else {
    await prisma.transaction.delete({ where: { id } });
  }

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function getTransactions(filters?: {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  from?: string;
  to?: string;
  limit?: number;
}) {
  return prisma.transaction.findMany({
    where: {
      ...(filters?.accountId ? { accountId: filters.accountId } : {}),
      ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters?.type ? { type: filters.type } : {}),
      ...(filters?.from || filters?.to
        ? {
            date: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: "desc" },
    take: filters?.limit,
    include: {
      account: { select: { id: true, name: true, color: true } },
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
  });
}
