"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";
import { formatCents } from "@/lib/money";
import { monthKey, monthKeyLabel } from "@/lib/dates";
import { VENDOR_TAG_LABEL } from "@/lib/vendorTags";
import { deleteVendorLabel } from "@/actions/vendorLabels";
import { VendorLabelForm } from "./VendorLabelForm";
import type { VendorTag } from "@/generated/prisma/client";

export interface LabeledRecurringItem {
  description: string;
  frequency: "Monthly" | "Annual";
  cents: number;
  lastDate: Date;
  occurrences: string;
  label: string;
  tag: VendorTag;
}

interface RecurringChargesTableProps {
  items: LabeledRecurringItem[];
}

export function RecurringChargesTable({ items }: RecurringChargesTableProps) {
  const router = useRouter();
  const [editItem, setEditItem] = useState<LabeledRecurringItem | null>(null);

  async function handleDelete(description: string) {
    if (!confirm("Remove this label?")) return;
    await deleteVendorLabel(description);
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground px-6 py-4">
        No recurring charges have been labeled yet.
      </p>
    );
  }

  const monthlyTotal = items
    .filter((i) => i.frequency === "Monthly" && i.tag !== "INVESTMENT" && i.tag !== "CREDIT_CARD")
    .reduce((s, i) => s + i.cents, 0);
  const annualTotal = items
    .filter((i) => i.frequency === "Annual" && i.tag !== "INVESTMENT" && i.tag !== "CREDIT_CARD")
    .reduce((s, i) => s + i.cents, 0);

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="text-left py-2 px-6 font-medium">Label</th>
            <th className="text-left py-2 px-3 font-medium">Tag</th>
            <th className="text-left py-2 px-3 font-medium">Frequency</th>
            <th className="text-right py-2 px-3 font-medium">Amount</th>
            <th className="text-right py-2 px-3 font-medium">Last Charged</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.description} className="border-b last:border-0 hover:bg-muted/30 group">
              <td className="py-2 px-6">
                {item.label}
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </td>
              <td className="py-2 px-3">
                <Badge variant="secondary">{VENDOR_TAG_LABEL[item.tag]}</Badge>
              </td>
              <td className="py-2 px-3 text-muted-foreground">{item.frequency}</td>
              <td className="py-2 px-3 text-right tabular-nums font-medium text-destructive">
                {formatCents(item.cents)}
              </td>
              <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                {monthKeyLabel(monthKey(item.lastDate))}
              </td>
              <td className="py-2 px-3">
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => setEditItem(item)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(item.description)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {monthlyTotal > 0 && (
            <tr className="border-t bg-muted/30 text-sm font-medium">
              <td className="py-2 px-6" colSpan={3}>
                Monthly total
              </td>
              <td className="py-2 px-3 text-right tabular-nums text-destructive" colSpan={3}>
                {formatCents(monthlyTotal)}
              </td>
            </tr>
          )}
          {annualTotal > 0 && (
            <tr className="border-t bg-muted/30 text-sm font-medium">
              <td className="py-2 px-6" colSpan={3}>
                Annual total
              </td>
              <td className="py-2 px-3 text-right tabular-nums text-destructive" colSpan={3}>
                {formatCents(annualTotal)}
              </td>
            </tr>
          )}
        </tfoot>
      </table>

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Label</DialogTitle>
          </DialogHeader>
          {editItem && (
            <VendorLabelForm
              description={editItem.description}
              existingLabel={{ label: editItem.label, tag: editItem.tag }}
              onDone={() => setEditItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
