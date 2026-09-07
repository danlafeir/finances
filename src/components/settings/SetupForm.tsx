"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type PlaidEnv = "sandbox" | "production";
type Mode = "offline" | "online";

export function SetupForm() {
  const [isElectron, setIsElectron] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>("offline");
  const [clientId, setClientId] = useState("");
  const [secret, setSecret] = useState("");
  const [env, setEnv] = useState<PlaidEnv>("sandbox");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const api = window.electronAPI;
    // window.electronAPI only exists client-side; detection must happen
    // after mount to avoid an SSR/hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsElectron(!!api);
    if (!api) return;
    api.getConfig().then((config) => {
      if (config.mode) setMode(config.mode);
      if (config.plaid) {
        setClientId(config.plaid.clientId);
        setSecret(config.plaid.secret);
        setEnv(config.plaid.env as PlaidEnv);
      }
    });
  }, []);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      // Restarts the app on success -- this window is about to go away.
      await window.electronAPI!.setConfig(
        mode === "offline"
          ? { mode: "offline" }
          : { mode: "online", clientId: clientId.trim(), secret: secret.trim(), env }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
      setSaving(false);
    }
  }

  if (isElectron === null) return null;

  if (!isElectron) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data source</CardTitle>
          <CardDescription>
            Running outside the desktop app — credentials come from <code>.env</code> in this mode.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const canSave = mode === "offline" || (clientId.trim() !== "" && secret.trim() !== "");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data source</CardTitle>
        <CardDescription>
          Manual entry and CSV import are always available. Choose how this install gets its data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode("offline")}
            className={cn(
              "rounded-lg border p-4 text-left transition-colors",
              mode === "offline" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
            )}
          >
            <div className="font-medium">Offline</div>
            <div className="text-sm text-muted-foreground mt-1">
              Manual entry and CSV import only. Existing connections stay saved but pause syncing.
            </div>
          </button>
          <button
            type="button"
            onClick={() => setMode("online")}
            className={cn(
              "rounded-lg border p-4 text-left transition-colors",
              mode === "online" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
            )}
          >
            <div className="font-medium">Online</div>
            <div className="text-sm text-muted-foreground mt-1">
              Connect accounts via Plaid (manual upload still available).
            </div>
          </button>
        </div>

        {mode === "online" && (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Enter your own Plaid API credentials from{" "}
              <a href="https://dashboard.plaid.com" target="_blank" rel="noreferrer" className="underline">
                dashboard.plaid.com
              </a>
              . Stored locally on this machine only.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="clientId">Client ID</Label>
              <Input id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="secret">Secret</Label>
              <Input id="secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="env">Environment</Label>
              <Select value={env} onValueChange={(v) => v && setEnv(v as PlaidEnv)}>
                <SelectTrigger id="env" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={handleSave} disabled={saving || !canSave}>
          {saving ? "Saving…" : "Save & Restart"}
        </Button>
      </CardContent>
    </Card>
  );
}
