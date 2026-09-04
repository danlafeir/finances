"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PlaidEnv = "sandbox" | "production";

export function PlaidSettingsForm() {
  const [isElectron, setIsElectron] = useState<boolean | null>(null);
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
    api.getPlaidSettings().then((current) => {
      if (!current) return;
      setClientId(current.clientId);
      setSecret(current.secret);
      setEnv(current.env as PlaidEnv);
    });
  }, []);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      // Restarts the app on success -- this window is about to go away.
      await window.electronAPI!.setPlaidSettings({ clientId: clientId.trim(), secret: secret.trim(), env });
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
          <CardTitle>Plaid credentials</CardTitle>
          <CardDescription>
            Running outside the desktop app — credentials come from <code>.env</code> in this mode.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plaid credentials</CardTitle>
        <CardDescription>
          Enter your own Plaid API credentials from{" "}
          <a href="https://dashboard.plaid.com" target="_blank" rel="noreferrer" className="underline">
            dashboard.plaid.com
          </a>
          . Stored locally on this machine only. Saving restarts the app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={handleSave} disabled={saving || !clientId.trim() || !secret.trim()}>
          {saving ? "Saving…" : "Save & Restart"}
        </Button>
      </CardContent>
    </Card>
  );
}
