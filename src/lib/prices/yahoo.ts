import yahooFinance from "yahoo-finance2";
import { prisma } from "@/lib/prisma";

const TTL_MINUTES = parseInt(process.env.PRICE_TTL_MINUTES ?? "15", 10);

export async function getPrice(ticker: string): Promise<{ priceCents: number; stale: boolean }> {
  const snapshot = await prisma.priceSnapshot.findUnique({ where: { ticker } });

  if (snapshot) {
    const ageMinutes = (Date.now() - snapshot.fetchedAt.getTime()) / 60000;
    if (ageMinutes < TTL_MINUTES) {
      return { priceCents: snapshot.priceCents, stale: false };
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote: any = await yahooFinance.quote(ticker);
    const price = (quote?.regularMarketPrice as number | undefined) ?? 0;
    const priceCents = Math.round(price * 100);
    const currency = (quote?.currency as string | undefined) ?? "USD";

    await prisma.priceSnapshot.upsert({
      where: { ticker },
      update: { priceCents, fetchedAt: new Date() },
      create: { ticker, priceCents, currency },
    });

    return { priceCents, stale: false };
  } catch {
    // Return stale data if available, otherwise cost basis fallback
    if (snapshot) return { priceCents: snapshot.priceCents, stale: true };
    return { priceCents: 0, stale: true };
  }
}

export async function refreshAllPrices(tickers: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  await Promise.allSettled(
    tickers.map(async (ticker) => {
      const { priceCents } = await getPrice(ticker);
      result.set(ticker, priceCents);
    })
  );

  return result;
}
