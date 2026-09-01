"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCents } from "@/lib/money";
import { deleteHolding } from "@/actions/holdings";
import { HoldingForm } from "./HoldingForm";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import type { getPortfolio } from "@/actions/holdings";
import type { Account } from "@/generated/prisma/client";

type Holding = Awaited<ReturnType<typeof getPortfolio>>["holdings"][number];

interface PortfolioTableProps {
  holdings: Holding[];
  totalValueCents: number;
  accounts: Account[];
}

export function PortfolioTable({ holdings, totalValueCents, accounts }: PortfolioTableProps) {
  const router = useRouter();
  const [editHolding, setEditHolding] = useState<Holding | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this holding?")) return;
    await deleteHolding(id);
    router.refresh();
  }

  if (holdings.length === 0) {
    return <p className="text-muted-foreground text-sm py-4">No holdings yet. Add your first holding.</p>;
  }

  return (
    <>
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Ticker</th>
              <th className="text-right px-3 py-2 font-medium">Shares</th>
              <th className="text-right px-3 py-2 font-medium">Cost Basis</th>
              <th className="text-right px-3 py-2 font-medium">Current Value</th>
              <th className="text-right px-3 py-2 font-medium">Gain/Loss</th>
              <th className="text-right px-3 py-2 font-medium">Allocation</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {holdings.map((h) => {
              const value = h.currentValueCents ?? h.costBasisCents;
              const allocationPct = totalValueCents > 0 ? (value / totalValueCents) * 100 : 0;

              return (
                <tr key={h.id} className="hover:bg-muted/30 group">
                  <td className="px-3 py-2 font-medium">
                    <div className="flex items-center gap-2">
                      {h.ticker}
                      {h.priceStale && (
                        <Badge variant="outline" className="text-xs text-amber-600">stale</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{h.account.name}</div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {h.shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {formatCents(h.costBasisCents)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">
                    {formatCents(value)}
                    {h.currentPriceCents != null && (
                      <div className="text-xs text-muted-foreground">
                        @ {formatCents(h.currentPriceCents)} / share
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {h.gainCents != null ? (
                      <span className={h.gainCents >= 0 ? "text-emerald-600" : "text-destructive"}>
                        {h.gainCents >= 0 ? "+" : ""}
                        {formatCents(h.gainCents)}
                        <div className="text-xs">
                          {h.gainPct != null
                            ? `(${h.gainPct >= 0 ? "+" : ""}${h.gainPct.toFixed(1)}%)`
                            : ""}
                        </div>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {allocationPct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => setEditHolding(h)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(h.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editHolding} onOpenChange={(open) => !open && setEditHolding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editHolding?.ticker}</DialogTitle>
          </DialogHeader>
          {editHolding && (
            <HoldingForm
              accounts={accounts}
              holding={editHolding}
              onDone={() => setEditHolding(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
