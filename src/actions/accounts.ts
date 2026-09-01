"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AccountType } from "@/generated/prisma/enums";
import { getPrice } from "@/lib/prices/yahoo";

const VestingEventInput = z.object({
  date: z.string().min(1),
  shares: z.number().positive(),
});

const AccountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.nativeEnum(AccountType),
  broker: z.string().optional(),
  ticker: z.string().optional(),
  snapshotBalanceCents: z.number().int(),
  snapshotDate: z.string().optional().nullable(),
  isLiability: z.boolean().default(false),
  color: z.string().optional(),
  currency: z.string().default("USD"),
  vestingEvents: z.array(VestingEventInput).optional(),
});

function signedSum(transactions: { type: string; amountCents: number }[]) {
  return transactions.reduce(
    (sum, t) => sum + (t.type === "INCOME" ? t.amountCents : -t.amountCents),
    0
  );
}

export async function createAccount(data: z.infer<typeof AccountSchema>) {
  const { vestingEvents, snapshotDate, ...accountData } = AccountSchema.parse(data);

  const account = await prisma.$transaction(async (tx) => {
    const created = await tx.account.create({
      data: {
        ...accountData,
        snapshotDate: snapshotDate ? new Date(snapshotDate) : null,
      },
    });
    if (vestingEvents?.length) {
      await tx.vestingEvent.createMany({
        data: vestingEvents.map((e) => ({
          accountId: created.id,
          date: new Date(e.date),
          shares: e.shares,
        })),
      });
    }
    return created;
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return account;
}

export async function updateAccount(id: string, data: z.infer<typeof AccountSchema>) {
  const { vestingEvents, snapshotDate, ...accountData } = AccountSchema.parse(data);

  const account = await prisma.$transaction(async (tx) => {
    const updated = await tx.account.update({
      where: { id },
      data: {
        ...accountData,
        snapshotDate: snapshotDate ? new Date(snapshotDate) : null,
      },
    });
    await tx.vestingEvent.deleteMany({ where: { accountId: id } });
    if (vestingEvents?.length) {
      await tx.vestingEvent.createMany({
        data: vestingEvents.map((e) => ({
          accountId: id,
          date: new Date(e.date),
          shares: e.shares,
        })),
      });
    }
    return updated;
  });

  revalidatePath("/accounts");
  revalidatePath(`/accounts/${id}`);
  revalidatePath("/dashboard");
  return account;
}

export async function deleteAccount(id: string) {
  await prisma.account.delete({ where: { id } });
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function clearAccountTransactions(id: string) {
  await prisma.transaction.deleteMany({ where: { accountId: id } });
  revalidatePath(`/accounts/${id}`);
  revalidatePath("/spending");
  revalidatePath("/dashboard");
}

export async function getAccounts() {
  return prisma.account.findMany({ orderBy: { createdAt: "asc" } });
}

export async function getAccountWithBalance(id: string) {
  const account = await prisma.account.findUniqueOrThrow({ where: { id } });
  const transactions = await prisma.transaction.findMany({
    where: {
      accountId: id,
      ...(account.snapshotDate ? { date: { gt: account.snapshotDate } } : {}),
    },
  });
  return { ...account, balanceCents: account.snapshotBalanceCents + signedSum(transactions) };
}

export async function getAllAccountsWithBalances() {
  const accounts = await prisma.account.findMany({ orderBy: { createdAt: "asc" } });
  const transactions = await prisma.transaction.findMany();

  return accounts.map((account) => {
    const eligible = account.snapshotDate
      ? transactions.filter(
          (t) => t.accountId === account.id && t.date > account.snapshotDate!
        )
      : transactions.filter((t) => t.accountId === account.id);
    return { ...account, balanceCents: account.snapshotBalanceCents + signedSum(eligible) };
  });
}

export async function lookupTickerPrice(ticker: string): Promise<number | null> {
  if (!ticker.trim()) return null;
  try {
    const { priceCents } = await getPrice(ticker.trim().toUpperCase());
    return priceCents || null;
  } catch {
    return null;
  }
}
