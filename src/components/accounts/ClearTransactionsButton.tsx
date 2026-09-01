"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { clearAccountTransactions } from "@/actions/accounts";
import { Trash2 } from "lucide-react";

export function ClearTransactionsButton({ accountId }: { accountId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClear() {
    setLoading(true);
    await clearAccountTransactions(accountId);
    setLoading(false);
    setConfirming(false);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-destructive">Delete all transactions?</span>
        <Button size="sm" variant="destructive" onClick={handleClear} disabled={loading}>
          {loading ? "Clearing..." : "Yes, clear all"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirming(true)}>
      <Trash2 className="h-3 w-3 mr-1" />
      Clear all transactions
    </Button>
  );
}
