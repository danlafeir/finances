"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import {
  createLinkToken as plaidCreateLinkToken,
  createUpdateModeLinkToken as plaidCreateUpdateModeLinkToken,
  exchangePublicToken as plaidExchangePublicToken,
  getAccountsForItem,
  removeItem,
} from "@/lib/plaid/client";
import { suggestAccountType, type AccountTypeSuggestion } from "@/lib/plaid/mapping";

export interface PlaidAccountForMapping {
  plaidAccountId: string;
  name: string;
  mask: string | null;
  officialName: string | null;
  currentBalanceCents: number | null;
  suggestion: AccountTypeSuggestion;
}

const ExchangeSchema = z.object({
  publicToken: z.string().min(1),
  institutionId: z.string().optional(),
  institutionName: z.string().optional(),
  ownerName: z.string().min(1),
});

export async function createLinkToken(ownerName: string): Promise<string> {
  if (!ownerName.trim()) throw new Error("Owner name is required");
  return plaidCreateLinkToken(ownerName.trim());
}

export async function exchangePublicToken(data: z.infer<typeof ExchangeSchema>) {
  const parsed = ExchangeSchema.parse(data);
  const { accessToken, itemId } = await plaidExchangePublicToken(parsed.publicToken);

  const connection = await prisma.plaidConnection.create({
    data: {
      itemId,
      accessTokenCiphertext: encrypt(accessToken),
      institutionId: parsed.institutionId,
      institutionName: parsed.institutionName,
      ownerName: parsed.ownerName,
      environment: process.env.PLAID_ENV ?? "sandbox",
    },
  });

  const rawAccounts = await getAccountsForItem(accessToken);
  const plaidAccounts: PlaidAccountForMapping[] = rawAccounts.map((a) => ({
    plaidAccountId: a.account_id,
    name: a.name,
    mask: a.mask,
    officialName: a.official_name,
    currentBalanceCents:
      a.balances.current != null ? Math.round(a.balances.current * 100) : null,
    suggestion: suggestAccountType(a.type, a.subtype),
  }));

  revalidatePath("/connections");
  return { connectionId: connection.id, plaidAccounts };
}

export async function createUpdateModeLinkToken(
  connectionId: string,
  options?: { forAddingAccounts?: boolean }
): Promise<string> {
  const connection = await prisma.plaidConnection.findUniqueOrThrow({ where: { id: connectionId } });
  const accessToken = decrypt(connection.accessTokenCiphertext);
  return plaidCreateUpdateModeLinkToken(accessToken, {
    accountSelectionEnabled: options?.forAddingAccounts,
  });
}

export async function completeReconnect(connectionId: string) {
  await prisma.plaidConnection.update({
    where: { id: connectionId },
    data: { status: "ACTIVE", lastSyncError: null },
  });
  revalidatePath("/connections");
}

// After update-mode Link with account selection enabled, Plaid returns every
// currently-selected account (old + newly added) — filter down to ones not
// already mapped to an app Account so the mapping dialog only shows new ones.
export async function getNewPlaidAccountsForMapping(connectionId: string): Promise<PlaidAccountForMapping[]> {
  const connection = await prisma.plaidConnection.findUniqueOrThrow({
    where: { id: connectionId },
    include: { accounts: { select: { plaidAccountId: true } } },
  });
  const accessToken = decrypt(connection.accessTokenCiphertext);
  const alreadyMapped = new Set(connection.accounts.map((a) => a.plaidAccountId));

  const rawAccounts = await getAccountsForItem(accessToken);
  return rawAccounts
    .filter((a) => !alreadyMapped.has(a.account_id))
    .map((a) => ({
      plaidAccountId: a.account_id,
      name: a.name,
      mask: a.mask,
      officialName: a.official_name,
      currentBalanceCents: a.balances.current != null ? Math.round(a.balances.current * 100) : null,
      suggestion: suggestAccountType(a.type, a.subtype),
    }));
}

export async function removeConnection(connectionId: string) {
  const connection = await prisma.plaidConnection.findUniqueOrThrow({ where: { id: connectionId } });
  try {
    await removeItem(decrypt(connection.accessTokenCiphertext));
  } catch {
    // Item may already be revoked/removed on Plaid's side — proceed to remove locally regardless.
  }
  // plaidAccountId is @unique and isn't cleared by the connection's onDelete:
  // SetNull (that only nulls plaidConnectionId), so a stale value would block
  // reconnecting the same Plaid account later — clear it explicitly.
  await prisma.$transaction([
    prisma.account.updateMany({ where: { plaidConnectionId: connectionId }, data: { plaidAccountId: null } }),
    prisma.plaidConnection.delete({ where: { id: connectionId } }),
  ]);
  revalidatePath("/connections");
  revalidatePath("/accounts");
}

export async function getConnections() {
  return prisma.plaidConnection.findMany({
    include: { accounts: { select: { id: true, name: true, type: true, plaidAccountId: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function getConnectionWithAccounts(id: string) {
  return prisma.plaidConnection.findUniqueOrThrow({
    where: { id },
    include: { accounts: true },
  });
}
