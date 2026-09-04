export {};

declare global {
  interface Window {
    electronAPI?: {
      isElectron: true;
      getPlaidSettings: () => Promise<{ clientId: string; secret: string; env: string } | null>;
      setPlaidSettings: (creds: { clientId: string; secret: string; env: string }) => Promise<void>;
    };
  }
}
