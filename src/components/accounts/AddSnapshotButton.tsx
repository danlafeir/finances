"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { addAccountSnapshot } from "@/actions/accounts";
import { saveAccountFile } from "@/actions/files";
import { acceptAttr } from "@/lib/files/accept";
import { parseDollarsToCents, centsToDisplay } from "@/lib/money";
import { Camera } from "lucide-react";
import type { Account } from "@/generated/prisma/client";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddSnapshotButton({ account, defaultAsOf }: { account: Account; defaultAsOf?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStockPlan = account.type === "STOCK_PLAN";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const balanceStr = fd.get("balance") as string;
    const asOfDate = fd.get("asOfDate") as string;

    const statement = fd.get("statement");

    try {
      const balanceCents = parseDollarsToCents(balanceStr || "0");
      const { updatedCurrent } = await addAccountSnapshot({ accountId: account.id, balanceCents, asOfDate });

      let fileProblem: string | null = null;
      if (statement instanceof File && statement.size > 0) {
        const upload = new FormData();
        upload.set("file", statement);
        upload.set("accountId", account.id);
        upload.set("kind", "STATEMENT");
        upload.set("asOfDate", asOfDate);
        const saved = await saveAccountFile(upload);
        if (!saved.ok) fileProblem = `The snapshot was saved, but the statement wasn't: ${saved.error}`;
      }

      if (fileProblem) {
        setError(fileProblem);
        setLoading(false);
        router.refresh();
        return;
      }
      if (!updatedCurrent) {
        setError(
          "Saved to history, but this date is older than the account's current as-of date, so the displayed balance wasn't changed."
        );
        setLoading(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Camera className="h-3 w-3 mr-1" />
        Add Snapshot
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Balance Snapshot</DialogTitle>
            <DialogDescription>
              Records a point-in-time balance for {account.name}. If this is the most recent
              snapshot on file, it also updates the balance and as-of date shown for this account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="balance">{isStockPlan ? "Unvested Amount" : "Balance"}</Label>
                <CurrencyInput
                  key={account.snapshotBalanceCents}
                  id="balance"
                  name="balance"
                  required
                  autoFocus
                  placeholder="$0.00"
                  defaultValue={centsToDisplay(account.snapshotBalanceCents)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="asOfDate">As of Date</Label>
                <Input key={defaultAsOf} id="asOfDate" name="asOfDate" type="date" required defaultValue={defaultAsOf ?? today()} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="statement">Statement (optional)</Label>
              <input
                id="statement"
                name="statement"
                type="file"
                accept={acceptAttr("STATEMENT")}
                className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium"
              />
              <p className="text-xs text-muted-foreground">
                Keeps a copy of the PDF, image, or CSV in your data folder.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Snapshot"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
