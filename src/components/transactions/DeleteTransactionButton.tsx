"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteTransaction } from "@/actions/transactions";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteTransactionButton({ id, hasPair }: { id: string; hasPair: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (hasPair && !confirm("This will delete both sides of the transfer. Continue?")) return;
    setLoading(true);
    await deleteTransaction(id);
    router.refresh();
    setLoading(false);
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
      onClick={handleDelete}
      disabled={loading}
    >
      <Trash2 className="h-3 w-3" />
    </Button>
  );
}
