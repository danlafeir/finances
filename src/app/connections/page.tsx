import { ConnectPlaidButton } from "@/components/plaid/ConnectPlaidButton";
import { ConnectionCard } from "@/components/plaid/ConnectionCard";
import { SyncNowButton } from "@/components/plaid/SyncNowButton";
import { getConnections } from "@/actions/plaidConnections";

export default async function ConnectionsPage() {
  const connections = await getConnections();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Connections</h1>
        <div className="flex items-center gap-2">
          {connections.length > 0 && <SyncNowButton label="Sync All" />}
          <ConnectPlaidButton />
        </div>
      </div>

      {connections.length === 0 ? (
        <p className="text-muted-foreground">
          No connections yet. Connect a bank or brokerage to sync balances, transactions, and
          holdings automatically.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map((connection) => (
            <ConnectionCard key={connection.id} connection={connection} />
          ))}
        </div>
      )}
    </div>
  );
}
