"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncNowButtonProps {
  connectionId?: string;
  label?: string;
  variant?: "default" | "outline";
  size?: "default" | "sm";
}

export function SyncNowButton({ connectionId, label = "Sync Now", variant = "outline", size = "sm" }: SyncNowButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plaid/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(connectionId ? { connectionId } : {}),
      });
      if (!res.ok) throw new Error("Sync failed");
      const data = await res.json();
      const failed = data.summaries?.find((s: { status: string }) => s.status === "error");
      if (failed) setError(failed.error ?? "Sync failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button variant={variant} size={size} onClick={handleSync} disabled={loading}>
        <RefreshCw className={cn("h-3 w-3 mr-1", loading && "animate-spin")} />
        {loading ? "Syncing..." : label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
