"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACCOUNT_TYPES } from "@/lib/accounts";
import { formatCents } from "@/lib/money";
import {
  linkPlaidAccountToNewAccount,
  linkPlaidAccountToExistingAccount,
  getUnlinkedAppAccounts,
} from "@/actions/plaidAccountMapping";
import type { PlaidAccountForMapping } from "@/actions/plaidConnections";
import type { Account } from "@/generated/prisma/client";

type Mode = "new" | "existing" | "skip";

interface RowState {
  mode: Mode;
  name: string;
  type: string;
  existingAccountId: string;
}

interface AccountMappingDialogProps {
  open: boolean;
  connectionId: string;
  institutionName: string | null;
  plaidAccounts: PlaidAccountForMapping[];
  onDone: () => void;
}

export function AccountMappingDialog({
  open,
  connectionId,
  institutionName,
  plaidAccounts,
  onDone,
}: AccountMappingDialogProps) {
  const router = useRouter();
  const [unlinkedAccounts, setUnlinkedAccounts] = useState<Account[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      plaidAccounts.map((a) => [
        a.plaidAccountId,
        {
          mode: a.suggestion.supported ? "new" : "skip",
          name: a.name,
          type: a.suggestion.accountType ?? "",
          existingAccountId: "",
        } satisfies RowState,
      ])
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) getUnlinkedAppAccounts().then(setUnlinkedAccounts);
  }, [open]);

  function updateRow(plaidAccountId: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [plaidAccountId]: { ...prev[plaidAccountId], ...patch } }));
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      for (const account of plaidAccounts) {
        const row = rows[account.plaidAccountId];
        if (row.mode === "skip") continue;
        if (row.mode === "new") {
          if (!row.name.trim() || !row.type) {
            throw new Error(`Please provide a name and type for "${account.name}"`);
          }
          await linkPlaidAccountToNewAccount({
            connectionId,
            plaidAccountId: account.plaidAccountId,
            name: row.name.trim(),
            type: row.type as Parameters<typeof linkPlaidAccountToNewAccount>[0]["type"],
            broker: institutionName ?? undefined,
          });
        } else {
          if (!row.existingAccountId) {
            throw new Error(`Please select an existing account for "${account.name}"`);
          }
          await linkPlaidAccountToExistingAccount({
            connectionId,
            plaidAccountId: account.plaidAccountId,
            accountId: row.existingAccountId,
          });
        }
      }
      router.refresh();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onDone()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Map accounts from {institutionName ?? "this institution"}</DialogTitle>
          <DialogDescription>
            Choose how each account Plaid found should map into your accounts. You can skip any
            account you don&apos;t want to sync.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2 max-h-[60vh] overflow-y-auto">
          {plaidAccounts.map((account) => {
            const row = rows[account.plaidAccountId];
            const supported = account.suggestion.supported;
            return (
              <div key={account.plaidAccountId} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {account.name}
                      {account.mask && <span className="text-muted-foreground"> ••{account.mask}</span>}
                    </p>
                    {account.currentBalanceCents != null && (
                      <p className="text-xs text-muted-foreground">{formatCents(account.currentBalanceCents)}</p>
                    )}
                  </div>
                  {!supported && (
                    <span className="text-xs text-muted-foreground">Not supported for sync yet</span>
                  )}
                </div>

                {supported && (
                  <>
                    <Select value={row.mode} onValueChange={(v) => v && updateRow(account.plaidAccountId, { mode: v as Mode })}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Create new account</SelectItem>
                        <SelectItem value="existing">Link to existing account</SelectItem>
                        <SelectItem value="skip">Skip</SelectItem>
                      </SelectContent>
                    </Select>

                    {row.mode === "new" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Name</Label>
                          <Input
                            className="h-8 text-xs"
                            value={row.name}
                            onChange={(e) => updateRow(account.plaidAccountId, { name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Type {!account.suggestion.confident && <span className="text-muted-foreground">(confirm)</span>}
                          </Label>
                          <Select
                            value={row.type}
                            onValueChange={(v) => v && updateRow(account.plaidAccountId, { type: v })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {ACCOUNT_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {row.mode === "existing" && (
                      <Select
                        value={row.existingAccountId}
                        onValueChange={(v) => v && updateRow(account.plaidAccountId, { existingAccountId: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
                        <SelectContent>
                          {unlinkedAccounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
