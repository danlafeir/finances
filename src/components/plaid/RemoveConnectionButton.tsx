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
import { removeConnection } from "@/actions/plaidConnections";
import { Trash2 } from "lucide-react";

export function RemoveConnectionButton({ id, institutionName }: { id: string; institutionName: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    setLoading(true);
    await removeConnection(id);
    router.refresh();
    setOpen(false);
    setLoading(false);
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="h-3 w-3 mr-1" />
        Remove
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove connection to {institutionName ?? "this institution"}?</DialogTitle>
            <DialogDescription>
              This stops syncing and revokes Plaid&apos;s access. Linked accounts and their
              transaction/holding history are kept — they just go back to being manually managed.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={loading}>
              {loading ? "Removing..." : "Remove Connection"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
