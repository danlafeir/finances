export {};

type PlaidCreds = { clientId: string; secret: string; env: string };
type AppConfig = { mode: "offline" | "online" | null; plaid: PlaidCreds | null };
type AppConfigInput = { mode: "offline" } | { mode: "online"; clientId: string; secret: string; env: string };

declare global {
  interface Window {
    electronAPI?: {
      isElectron: true;
      getConfig: () => Promise<AppConfig>;
      setConfig: (config: AppConfigInput) => Promise<void>;
    };
  }
}
