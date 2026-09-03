"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { unlinkAccount } from "@/actions/plaidAccountMapping";
import { Unlink } from "lucide-react";

export function UnlinkAccountButton({ accountId, accountName }: { accountId: string; accountName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleUnlink() {
    setLoading(true);
    await unlinkAccount(accountId);
    router.refresh();
    setOpen(false);
    setLoading(false);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Unlink className="h-3 w-3 mr-1" />
        Unlink from Plaid
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlink &ldquo;{accountName}&rdquo; from Plaid?</DialogTitle>
            <DialogDescription>
              This stops syncing this account. Its existing balance history and transactions are
              kept, and you can manage it manually going forward — the underlying Plaid connection
              stays active for any other accounts still mapped to it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUnlink} disabled={loading}>
              {loading ? "Unlinking..." : "Unlink"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
