import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTransactions } from "@/actions/transactions";
import { formatCents } from "@/lib/money";
import Link from "next/link";

export async function RecentTransactions() {
  const transactions = await getTransactions({ limit: 8 });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <Link href="/transactions" className="text-xs text-muted-foreground hover:underline">
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="space-y-0.5">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-1.5 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground text-xs w-14 shrink-0">
                    {new Date(t.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="truncate">{t.description}</span>
                  {t.category && (
                    <Badge variant="outline" className="text-xs shrink-0 hidden sm:flex">
                      {t.category.icon}
                    </Badge>
                  )}
                </div>
                <span
                  className={`tabular-nums font-medium shrink-0 ml-2 ${
                    t.type === "INCOME" ? "text-emerald-600" : ""
                  }`}
                >
                  {t.type === "INCOME" ? "+" : "-"}
                  {formatCents(t.amountCents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
