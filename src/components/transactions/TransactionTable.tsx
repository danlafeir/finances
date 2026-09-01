import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/money";
import { DeleteTransactionButton } from "./DeleteTransactionButton";
import type { getTransactions } from "@/actions/transactions";

type Transaction = Awaited<ReturnType<typeof getTransactions>>[number];

interface TransactionTableProps {
  transactions: Transaction[];
  showAccount?: boolean;
}

export function TransactionTable({ transactions, showAccount = true }: TransactionTableProps) {
  if (transactions.length === 0) {
    return <p className="text-muted-foreground text-sm py-4">No transactions found.</p>;
  }

  return (
    <div className="space-y-0.5">
      {transactions.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 py-2.5 px-3 rounded-md hover:bg-muted/40 group text-sm"
        >
          <span className="text-muted-foreground w-20 shrink-0 tabular-nums">
            {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{t.description}</p>
            {showAccount && (
              <p className="text-xs text-muted-foreground">{t.account.name}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {t.category && (
              <Badge variant="outline" className="text-xs hidden sm:flex">
                {t.category.icon} {t.category.name}
              </Badge>
            )}
            {t.transferPairId && (
              <Badge variant="secondary" className="text-xs hidden sm:flex">
                transfer
              </Badge>
            )}
          </div>
          <span
            className={`font-medium tabular-nums w-24 text-right shrink-0 ${
              t.type === "INCOME" ? "text-emerald-600" : ""
            }`}
          >
            {t.type === "INCOME" ? "+" : "-"}
            {formatCents(t.amountCents)}
          </span>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <DeleteTransactionButton id={t.id} hasPair={!!t.transferPairId} />
          </div>
        </div>
      ))}
    </div>
  );
}
