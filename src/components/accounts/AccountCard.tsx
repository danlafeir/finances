import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/money";
import type { Account } from "@/generated/prisma/client";

const TYPE_LABELS: Record<string, string> = {
  CHECKING: "Checking",
  CASH: "Cash",
  QUALIFIED_BROKERAGE: "Qualified Brokerage",
  TAXABLE_BROKERAGE: "Taxable Brokerage",
  STOCK_PLAN: "Stock Plan",
};

interface AccountCardProps {
  account: Account & { balanceCents: number };
}

export function AccountCard({ account }: AccountCardProps) {
  const isNegative = account.balanceCents < 0;

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
            <Badge variant="secondary">{TYPE_LABELS[account.type] ?? account.type}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold tabular-nums ${isNegative ? "text-destructive" : ""}`}>
            {formatCents(account.balanceCents)}
          </p>
          {account.isLiability && (
            <p className="text-xs text-muted-foreground mt-1">Liability (subtracts from net worth)</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
