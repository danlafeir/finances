import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/money";
import { ACCOUNT_TYPE_LABEL } from "@/lib/accounts";
import type { Account } from "@/generated/prisma/client";

interface AccountCardProps {
  account: Account & { balanceCents: number };
}

export function AccountCard({ account }: AccountCardProps) {
  return (
    <Link href={`/accounts/${account.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {account.color && (
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: account.color }}
                />
              )}
              <CardTitle className="text-base">{account.name}</CardTitle>
            </div>
            <Badge
              variant="secondary"
              className={
                account.type === "STOCK_PLAN"
                  ? "text-amber-500"
                  : account.isLiability
                  ? "text-destructive"
                  : "text-emerald-600"
              }
            >
              {ACCOUNT_TYPE_LABEL[account.type] ?? account.type}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold tabular-nums">
            {formatCents(account.balanceCents)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            As of{" "}
            {(account.snapshotDate
              ? new Date(account.snapshotDate)
              : new Date()
            ).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
