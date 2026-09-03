import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RemoveConnectionButton } from "@/components/plaid/RemoveConnectionButton";
import { ACCOUNT_TYPE_LABEL } from "@/lib/accounts";
import type { PlaidConnection, Account } from "@/generated/prisma/client";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  LOGIN_REQUIRED: "Needs reconnect",
  ERROR: "Error",
};

const STATUS_VARIANT: Record<string, "secondary" | "destructive"> = {
  ACTIVE: "secondary",
  LOGIN_REQUIRED: "destructive",
  ERROR: "destructive",
};

interface ConnectionCardProps {
  connection: PlaidConnection & { accounts: Pick<Account, "id" | "name" | "type" | "plaidAccountId">[] };
}

export function ConnectionCard({ connection }: ConnectionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{connection.institutionName ?? "Unknown institution"}</CardTitle>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              {connection.ownerName} · {connection.environment}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[connection.status] ?? "secondary"}>
            {STATUS_LABEL[connection.status] ?? connection.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {connection.lastSyncError && connection.status !== "ACTIVE" && (
          <p className="text-xs text-destructive">{connection.lastSyncError}</p>
        )}
        <div className="space-y-1">
          {connection.accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounts mapped yet.</p>
          ) : (
            connection.accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span>{a.name}</span>
                <span className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABEL[a.type] ?? a.type}</span>
              </div>
            ))
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {connection.lastSyncedAt
            ? `Last synced ${new Date(connection.lastSyncedAt).toLocaleString()}`
            : "Never synced"}
        </p>
        <div className="flex justify-end">
          <RemoveConnectionButton id={connection.id} institutionName={connection.institutionName} />
        </div>
      </CardContent>
    </Card>
  );
}
