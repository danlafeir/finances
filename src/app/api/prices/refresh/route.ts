import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refreshAllPrices } from "@/lib/prices/yahoo";

export async function POST() {
  const holdings = await prisma.holding.findMany({ select: { ticker: true } });
  const tickers = [...new Set(holdings.map((h) => h.ticker))];

  if (tickers.length === 0) {
    return NextResponse.json({ message: "No holdings to refresh", tickers: [] });
  }

  const prices = await refreshAllPrices(tickers);
  const result = Object.fromEntries(prices);

  return NextResponse.json({ message: `Refreshed ${tickers.length} tickers`, prices: result });
}
