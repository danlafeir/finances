"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PlaidLinkLauncher } from "@/components/plaid/PlaidLinkLauncher";
import { AccountMappingDialog } from "@/components/plaid/AccountMappingDialog";
import { createLinkToken, exchangePublicToken, type PlaidAccountForMapping } from "@/actions/plaidConnections";
import type { PlaidLinkOnSuccess } from "react-plaid-link";

export function ConnectPlaidButton() {
  const router = useRouter();
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mapping, setMapping] = useState<{
    connectionId: string;
    institutionName: string | null;
    plaidAccounts: PlaidAccountForMapping[];
  } | null>(null);

  async function handleStart() {
    if (!ownerName.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const token = await createLinkToken(ownerName.trim());
      setOwnerDialogOpen(false);
      setLinkToken(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Plaid Link");
    } finally {
      setLoading(false);
    }
  }

  const handleSuccess: PlaidLinkOnSuccess = async (publicToken, metadata) => {
    setLinkToken(null);
    if (!publicToken) return;
    try {
      const { connectionId, plaidAccounts } = await exchangePublicToken({
        publicToken,
        institutionId: metadata.institution?.institution_id,
        institutionName: metadata.institution?.name,
        ownerName,
      });
      setMapping({ connectionId, institutionName: metadata.institution?.name ?? null, plaidAccounts });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to finish connecting");
    }
  };

  return (
    <>
      <Button onClick={() => setOwnerDialogOpen(true)}>
        <Landmark className="h-4 w-4 mr-1.5" />
        Connect Institution
      </Button>

      <Dialog open={ownerDialogOpen} onOpenChange={setOwnerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect an institution</DialogTitle>
            <DialogDescription>
              Who is authenticating with the bank or broker? This just labels the connection —
              it doesn&apos;t create a login for the app itself.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 mt-2">
            <Label htmlFor="ownerName">Owner</Label>
            <Input
              id="ownerName"
              autoFocus
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="e.g. Dan"
            />
          </div>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOwnerDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleStart} disabled={loading || !ownerName.trim()}>
              {loading ? "Starting..." : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {linkToken && <PlaidLinkLauncher token={linkToken} onSuccess={handleSuccess} onExit={() => setLinkToken(null)} />}

      {mapping && (
        <AccountMappingDialog
          open
          connectionId={mapping.connectionId}
          institutionName={mapping.institutionName}
          plaidAccounts={mapping.plaidAccounts}
          onDone={() => {
            setMapping(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
