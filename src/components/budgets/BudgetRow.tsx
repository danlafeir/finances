"use client";

import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCents, parseDollarsToCents, centsToDisplay } from "@/lib/money";
import { upsertBudget, deleteBudget } from "@/actions/budgets";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Check, X } from "lucide-react";

interface BudgetRowProps {
  description: string;
  monthKey: string;
  limitCents: number | null;
  spentCents: number;
}

export function BudgetRow({ description, monthKey, limitCents, spentCents }: BudgetRowProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(limitCents ? centsToDisplay(limitCents) : "");
  const [loading, setLoading] = useState(false);

  const pct = limitCents ? Math.min(Math.round((spentCents / limitCents) * 100), 100) : 0;
  const overBudget = limitCents ? spentCents > limitCents : false;

  async function handleSave() {
    setLoading(true);
    try {
      const cents = parseDollarsToCents(value || "0");
      await upsertBudget(description, monthKey, cents);
      setEditing(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    await deleteBudget(description, monthKey);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="py-3 px-3 rounded-md hover:bg-muted/30 group">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium truncate mr-2">{description}</span>
        <div className="flex items-center gap-2 shrink-0">
          {editing ? (
            <>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-28 h-6 text-sm"
                placeholder="0.00"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleSave} disabled={loading}>
                <Check className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditing(false)}>
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm tabular-nums">
                <span className={overBudget ? "text-destructive font-medium" : ""}>{formatCents(spentCents)}</span>
                {limitCents && (
                  <span className="text-muted-foreground"> / {formatCents(limitCents)}</span>
                )}
              </span>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditing(true)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                {limitCents && (
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={handleDelete} disabled={loading}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {limitCents && (
        <Progress
          value={pct}
          className={`h-1.5 ${overBudget ? "[&>div]:bg-destructive" : ""}`}
        />
      )}
    </div>
  );
}
