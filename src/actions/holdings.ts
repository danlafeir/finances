"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const HoldingSchema = z.object({
  ticker: z.string().min(1).toUpperCase(),
  name: z.string().optional(),
  shares: z.number().positive(),
  costBasisCents: z.number().int().nonnegative(),
  accountId: z.string(),
});

export async function createHolding(data: z.infer<typeof HoldingSchema>) {
  const parsed = HoldingSchema.parse(data);
  const holding = await prisma.holding.create({ data: parsed });
  revalidatePath("/investments");
  return holding;
}

export async function updateHolding(id: string, data: z.infer<typeof HoldingSchema>) {
  const parsed = HoldingSchema.parse(data);
  const holding = await prisma.holding.update({ where: { id }, data: parsed });
  revalidatePath("/investments");
  return holding;
}

export async function deleteHolding(id: string) {
  await prisma.holding.delete({ where: { id } });
  revalidatePath("/investments");
}

export async function getPortfolio() {
  const holdings = await prisma.holding.findMany({
    include: { account: { select: { id: true, name: true } } },
    orderBy: { ticker: "asc" },
  });

  const snapshots = await prisma.priceSnapshot.findMany({
    where: { ticker: { in: holdings.map((h) => h.ticker) } },
  });

  const priceMap = new Map(snapshots.map((s) => [s.ticker, s]));

  const enriched = holdings.map((h) => {
    const snap = priceMap.get(h.ticker);
    const currentPriceCents = snap?.priceCents ?? null;
    const currentValueCents = currentPriceCents != null ? Math.round(h.shares * currentPriceCents) : null;
    const gainCents = currentValueCents != null ? currentValueCents - h.costBasisCents : null;
    const gainPct =
      h.costBasisCents > 0 && gainCents != null
        ? (gainCents / h.costBasisCents) * 100
        : null;
    const priceStale = snap == null;

    return { ...h, currentPriceCents, currentValueCents, gainCents, gainPct, priceStale };
  });

  const totalValueCents = enriched.reduce(
    (s, h) => s + (h.currentValueCents ?? h.costBasisCents),
    0
  );
  const hasStale = enriched.some((h) => h.priceStale);

  return { holdings: enriched, totalValueCents, hasStale };
}
