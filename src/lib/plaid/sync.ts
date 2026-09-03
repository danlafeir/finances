import "server-only";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import {
  getAccountsForItem,
  syncTransactionsPage,
  getInvestmentHoldings,
  isItemLoginRequired,
  type Transaction as PlaidTransaction,
  type RemovedTransaction,
} from "@/lib/plaid/client";
import { syncAccountBalance } from "@/lib/plaid/balance";
import { INVESTMENT_GROWTH_TYPES } from "@/lib/accounts";

export interface ConnectionSyncSummary {
  connectionId: string;
  institutionName: string | null;
  status: "synced" | "login_required" | "error";
  balancesSynced: number;
  transactionsAdded: number;
  transactionsModified: number;
  transactionsRemoved: number;
  holdingsSynced: number;
  error?: string;
}

export async function syncConnection(connectionId: string): Promise<ConnectionSyncSummary> {
  const connection = await prisma.plaidConnection.findUniqueOrThrow({
    where: { id: connectionId },
    include: { accounts: true },
  });

  const summary: ConnectionSyncSummary = {
    connectionId,
    institutionName: connection.institutionName,
    status: "synced",
    balancesSynced: 0,
    transactionsAdded: 0,
    transactionsModified: 0,
    transactionsRemoved: 0,
    holdingsSynced: 0,
  };

  const mappedAccounts = connection.accounts.filter((a) => a.plaidAccountId);
  if (mappedAccounts.length === 0) return summary;

  const accountByPlaidId = new Map(mappedAccounts.map((a) => [a.plaidAccountId!, a]));

  try {
    const accessToken = decrypt(connection.accessTokenCiphertext);

    // Balances
    const plaidAccounts = await getAccountsForItem(accessToken);
    const now = new Date();
    for (const pa of plaidAccounts) {
      const account = accountByPlaidId.get(pa.account_id);
      if (!account || pa.balances.current == null) continue;
      await syncAccountBalance(account.id, account.type, Math.round(pa.balances.current * 100), now);
      summary.balancesSynced++;
    }

    // Transactions — cursor-based, accumulate every page before writing anything.
    let cursor: string | null = connection.cursor;
    let hasMore = true;
    const added: PlaidTransaction[] = [];
    const modified: PlaidTransaction[] = [];
    const removed: RemovedTransaction[] = [];
    while (hasMore) {
      const page = await syncTransactionsPage(accessToken, cursor);
      added.push(...page.added);
      modified.push(...page.modified);
      removed.push(...page.removed);
      hasMore = page.has_more;
      cursor = page.next_cursor;
    }

    // Plaid returns every account on the Item, including ones the user chose
    // "skip" for during mapping — restrict writes to accounts we actually mapped.
    async function upsertTransaction(t: PlaidTransaction): Promise<boolean> {
      if (t.pending) return false; // pending txns get a new transaction_id once posted
      const account = accountByPlaidId.get(t.account_id);
      if (!account) return false;
      await prisma.transaction.upsert({
        where: { accountId_externalId: { accountId: account.id, externalId: t.transaction_id } },
        create: {
          accountId: account.id,
          externalId: t.transaction_id,
          date: new Date(t.date),
          description: t.merchant_name || t.name,
          amountCents: Math.round(Math.abs(t.amount) * 100),
          type: t.amount > 0 ? "EXPENSE" : "INCOME",
          source: "PLAID",
        },
        update: {
          date: new Date(t.date),
          description: t.merchant_name || t.name,
          amountCents: Math.round(Math.abs(t.amount) * 100),
          type: t.amount > 0 ? "EXPENSE" : "INCOME",
        },
      });
      return true;
    }

    for (const t of added) {
      if (await upsertTransaction(t)) summary.transactionsAdded++;
    }
    for (const t of modified) {
      if (await upsertTransaction(t)) summary.transactionsModified++;
    }

    for (const r of removed) {
      const account = accountByPlaidId.get(r.account_id);
      if (!account) continue;
      await prisma.transaction.deleteMany({
        where: { accountId: account.id, externalId: r.transaction_id, source: "PLAID" },
      });
      summary.transactionsRemoved++;
    }

    // Holdings — only for accounts of an investment-growth type; skip tickerless
    // securities (cash sweeps, CUSIP-only) in v1.
    const investmentAccounts = mappedAccounts.filter((a) => INVESTMENT_GROWTH_TYPES.has(a.type));
    if (investmentAccounts.length > 0) {
      const holdingsRes = await getInvestmentHoldings(accessToken);
      const securityById = new Map(holdingsRes.securities.map((s) => [s.security_id, s]));

      for (const account of investmentAccounts) {
        const accountHoldings = holdingsRes.holdings.filter((h) => h.account_id === account.plaidAccountId);
        const seenTickers: string[] = [];

        for (const h of accountHoldings) {
          const ticker = securityById.get(h.security_id)?.ticker_symbol;
          if (!ticker) continue;
          seenTickers.push(ticker);
          const name = securityById.get(h.security_id)?.name ?? undefined;

          await prisma.holding.upsert({
            where: { accountId_ticker: { accountId: account.id, ticker } },
            create: {
              accountId: account.id,
              ticker,
              name,
              shares: h.quantity,
              costBasisCents: h.cost_basis != null ? Math.round(h.cost_basis * 100) : 0,
              source: "PLAID",
              plaidSecurityId: h.security_id,
            },
            update: {
              name,
              shares: h.quantity,
              source: "PLAID",
              plaidSecurityId: h.security_id,
              ...(h.cost_basis != null ? { costBasisCents: Math.round(h.cost_basis * 100) } : {}),
            },
          });
          summary.holdingsSynced++;
        }

        await prisma.holding.deleteMany({
          where: { accountId: account.id, source: "PLAID", ticker: { notIn: seenTickers } },
        });
      }
    }

    await prisma.plaidConnection.update({
      where: { id: connectionId },
      data: { cursor, status: "ACTIVE", lastSyncedAt: new Date(), lastSyncError: null },
    });
  } catch (err) {
    if (isItemLoginRequired(err)) {
      summary.status = "login_required";
      await prisma.plaidConnection.update({
        where: { id: connectionId },
        data: { status: "LOGIN_REQUIRED", lastSyncError: "Login required — reconnect this institution." },
      });
    } else {
      summary.status = "error";
      summary.error = err instanceof Error ? err.message : "Unknown error";
      await prisma.plaidConnection.update({
        where: { id: connectionId },
        data: { status: "ERROR", lastSyncError: summary.error },
      });
    }
  }

  return summary;
}

export async function syncAllConnections(): Promise<ConnectionSyncSummary[]> {
  const connections = await prisma.plaidConnection.findMany({ select: { id: true } });
  const summaries: ConnectionSyncSummary[] = [];
  for (const c of connections) {
    summaries.push(await syncConnection(c.id));
  }
  return summaries;
}
