import { prisma } from "@/lib/prisma";
import { addAccountSnapshot } from "@/actions/accounts";

// MORTGAGE balance comes from MortgageDetails, not a Plaid market value.
// STOCK_PLAN's snapshotBalanceCents means "unvested amount," not a balance —
// writing a synced value there would corrupt data the vesting UI depends on.
const SKIP_BALANCE_SYNC_TYPES = new Set(["MORTGAGE", "STOCK_PLAN"]);

export async function syncAccountBalance(
  accountId: string,
  accountType: string,
  balanceCents: number,
  asOf: Date
): Promise<void> {
  if (SKIP_BALANCE_SYNC_TYPES.has(accountType)) return;

  const dayStart = new Date(asOf);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(asOf);
  dayEnd.setHours(23, 59, 59, 999);

  const existingToday = await prisma.accountSnapshot.findFirst({
    where: { accountId, asOfDate: { gte: dayStart, lte: dayEnd } },
    orderBy: { asOfDate: "desc" },
  });

  if (existingToday) {
    if (existingToday.balanceCents === balanceCents) return;
    // Repeat same-day sync: update the existing history row directly rather than
    // inserting a second point, and advance the account's live fields ourselves
    // since we're bypassing addAccountSnapshot's own insert-then-advance path.
    await prisma.$transaction([
      prisma.accountSnapshot.update({
        where: { id: existingToday.id },
        data: { balanceCents, asOfDate: asOf },
      }),
      prisma.account.update({
        where: { id: accountId },
        data: { snapshotBalanceCents: balanceCents, snapshotDate: asOf },
      }),
    ]);
    return;
  }

  await addAccountSnapshot({ accountId, balanceCents, asOfDate: asOf.toISOString() });
}
