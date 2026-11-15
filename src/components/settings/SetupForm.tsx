"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function SetupForm() {
  const [isElectron, setIsElectron] = useState<boolean | null>(null);
  const [dataDir, setDataDir] = useState("");
  const [defaultDir, setDefaultDir] = useState("");
  const [pending, setPending] = useState<string | null>(null);
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
      setDataDir(config.dataDir);
      setDefaultDir(config.defaultDataDir);
    });
  }, []);

  async function handleChoose() {
    setError(null);
    const dir = await window.electronAPI!.chooseDataDir();
    if (dir && dir !== dataDir) setPending(dir);
  }

  async function handleSave(dir: string | null) {
    setError(null);
    setSaving(true);
    try {
      // Restarts the app on success -- this window is about to go away.
      await window.electronAPI!.setDataDir(dir);
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
          <CardTitle>Data location</CardTitle>
          <CardDescription>
            Running outside the desktop app — the database location comes from <code>DATABASE_URL</code> in{" "}
            <code>.env</code>.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const target = pending ?? dataDir;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data location</CardTitle>
        <CardDescription>
          Folder holding <code>finances.db</code> — all accounts, transactions, and uploaded documents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-mono break-all">{target}</div>
        {pending && (
          <p className="text-sm text-muted-foreground">
            Your database will be copied to this folder (an existing <code>finances.db</code> there is used as-is, never
            overwritten) and the app will restart. The old copy is left in place as a backup.
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          {pending ? (
            <>
              <Button onClick={() => handleSave(pending)} disabled={saving}>
                {saving ? "Saving…" : "Move & Restart"}
              </Button>
              <Button variant="outline" onClick={() => setPending(null)} disabled={saving}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleChoose} disabled={saving}>
                Choose folder…
              </Button>
              {dataDir !== defaultDir && (
                <Button variant="outline" onClick={() => setPending(defaultDir)} disabled={saving}>
                  Reset to default
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
