"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlaidLinkLauncher } from "@/components/plaid/PlaidLinkLauncher";
import { AccountMappingDialog } from "@/components/plaid/AccountMappingDialog";
import { createUpdateModeLinkToken, getNewPlaidAccountsForMapping, type PlaidAccountForMapping } from "@/actions/plaidConnections";
import { Plus } from "lucide-react";

interface AddAccountsButtonProps {
  connectionId: string;
  institutionName: string | null;
}

export function AddAccountsButton({ connectionId, institutionName }: AddAccountsButtonProps) {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newAccounts, setNewAccounts] = useState<PlaidAccountForMapping[] | null>(null);

  async function start() {
    setError(null);
    setLoading(true);
    try {
      const token = await createUpdateModeLinkToken(connectionId, { forAddingAccounts: true });
      setLinkToken(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="inline-flex flex-col items-end gap-1">
        <Button variant="outline" size="sm" onClick={start} disabled={loading}>
          <Plus className="h-3 w-3 mr-1" />
          {loading ? "Starting..." : "Add Accounts"}
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {linkToken && (
        <PlaidLinkLauncher
          token={linkToken}
          onSuccess={async () => {
            setLinkToken(null);
            const accounts = await getNewPlaidAccountsForMapping(connectionId);
            if (accounts.length === 0) {
              router.refresh();
              return;
            }
            setNewAccounts(accounts);
          }}
          onExit={() => setLinkToken(null)}
        />
      )}

      {newAccounts && (
        <AccountMappingDialog
          open
          connectionId={connectionId}
          institutionName={institutionName}
          plaidAccounts={newAccounts}
          onDone={() => {
            setNewAccounts(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
