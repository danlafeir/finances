"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AccountType } from "@/generated/prisma/enums";
import { deriveAccountDefaults } from "@/lib/accounts";

const NewAccountSchema = z.object({
  connectionId: z.string().min(1),
  plaidAccountId: z.string().min(1),
  name: z.string().min(1),
  type: z.nativeEnum(AccountType),
  broker: z.string().optional(),
});

const ExistingAccountSchema = z.object({
  connectionId: z.string().min(1),
  plaidAccountId: z.string().min(1),
  accountId: z.string().min(1),
});

export async function getUnlinkedAppAccounts() {
  return prisma.account.findMany({
    where: { plaidConnectionId: null },
    orderBy: { name: "asc" },
  });
}

export async function linkPlaidAccountToNewAccount(data: z.infer<typeof NewAccountSchema>) {
  const parsed = NewAccountSchema.parse(data);
  const account = await prisma.account.create({
    data: {
      name: parsed.name,
      type: parsed.type,
      broker: parsed.broker,
      ...deriveAccountDefaults(parsed.type),
      currency: "USD",
      plaidConnectionId: parsed.connectionId,
      plaidAccountId: parsed.plaidAccountId,
    },
  });
  revalidatePath("/connections");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return account;
}

export async function linkPlaidAccountToExistingAccount(data: z.infer<typeof ExistingAccountSchema>) {
  const parsed = ExistingAccountSchema.parse(data);
  const account = await prisma.account.update({
    where: { id: parsed.accountId },
    data: { plaidConnectionId: parsed.connectionId, plaidAccountId: parsed.plaidAccountId },
  });
  revalidatePath("/connections");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return account;
}

export async function unlinkAccount(accountId: string) {
  await prisma.account.update({
    where: { id: accountId },
    data: { plaidConnectionId: null, plaidAccountId: null },
  });
  revalidatePath("/connections");
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${accountId}`);
}
