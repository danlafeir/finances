"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCents } from "@/lib/money";
import { monthKey, monthKeyLabel } from "@/lib/dates";
import { VendorLabelForm } from "./VendorLabelForm";

export interface UnclassifiedRecurringItem {
  description: string;
  frequency: "Monthly" | "Annual";
  cents: number;
  lastDate: Date;
  occurrences: string;
}

interface UnclassifiedRecurringTableProps {
  items: UnclassifiedRecurringItem[];
}

export function UnclassifiedRecurringTable({ items }: UnclassifiedRecurringTableProps) {
  const [labelingItem, setLabelingItem] = useState<UnclassifiedRecurringItem | null>(null);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground px-6 py-4">
        All detected recurring charges have been labeled.
      </p>
    );
  }

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="text-left py-2 px-6 font-medium">Description</th>
            <th className="text-left py-2 px-3 font-medium">Frequency</th>
            <th className="text-left py-2 px-3 font-medium">Occurrences</th>
            <th className="text-right py-2 px-3 font-medium">Amount</th>
            <th className="text-right py-2 px-3 font-medium">Last Charged</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.description} className="border-b last:border-0 hover:bg-muted/30">
              <td className="py-2 px-6">{item.description}</td>
              <td className="py-2 px-3 text-muted-foreground">{item.frequency}</td>
              <td className="py-2 px-3 text-muted-foreground">{item.occurrences}</td>
              <td className="py-2 px-3 text-right tabular-nums font-medium text-destructive">
                {formatCents(item.cents)}
              </td>
              <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                {monthKeyLabel(monthKey(item.lastDate))}
              </td>
              <td className="py-2 px-3 text-right">
                <Button size="sm" variant="outline" onClick={() => setLabelingItem(item)}>
                  Label
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!labelingItem} onOpenChange={(open) => !open && setLabelingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Label Recurring Charge</DialogTitle>
          </DialogHeader>
          {labelingItem && (
            <VendorLabelForm
              description={labelingItem.description}
              onDone={() => setLabelingItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
