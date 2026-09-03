"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlaidLinkLauncher } from "@/components/plaid/PlaidLinkLauncher";
import { createUpdateModeLinkToken, completeReconnect } from "@/actions/plaidConnections";
import { RotateCw } from "lucide-react";

export function ReconnectButton({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setError(null);
    setLoading(true);
    try {
      const token = await createUpdateModeLinkToken(connectionId);
      setLinkToken(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start reconnect");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button variant="destructive" size="sm" onClick={start} disabled={loading}>
        <RotateCw className="h-3 w-3 mr-1" />
        {loading ? "Starting..." : "Reconnect"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {linkToken && (
        <PlaidLinkLauncher
          token={linkToken}
          onSuccess={async () => {
            setLinkToken(null);
            await completeReconnect(connectionId);
            router.refresh();
          }}
          onExit={() => setLinkToken(null)}
        />
      )}
    </div>
  );
}
