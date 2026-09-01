import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/money";
import { getAccountWithBalance } from "@/actions/accounts";
import { prisma } from "@/lib/prisma";
import { Pencil } from "lucide-react";
import { DeleteAccountButton } from "@/components/accounts/DeleteAccountButton";
import { cn } from "@/lib/utils";
import { ACCOUNT_TYPE_LABEL } from "@/lib/accounts";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let account;
  try {
    account = await getAccountWithBalance(id);
  } catch {
    notFound();
  }

  const transactions = await prisma.transaction.findMany({
    where: { accountId: id },
    orderBy: { date: "desc" },
    take: 50,
    include: { category: true },
  });

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {account.color && (
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: account.color }} />
            )}
            <h1 className="text-2xl font-semibold">{account.name}</h1>
            <Badge variant="secondary">{ACCOUNT_TYPE_LABEL[account.type] ?? account.type}</Badge>
          </div>
          <p className="text-3xl font-bold tabular-nums">{formatCents(account.balanceCents)}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/accounts/${id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Link>
          <DeleteAccountButton id={id} name={account.name} />
        </div>
      </div>

      <h2 className="text-lg font-medium mb-3">Recent Transactions</h2>
      {transactions.length === 0 ? (
        <p className="text-muted-foreground text-sm">No transactions yet.</p>
      ) : (
        <div className="space-y-1">
          {transactions.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground w-24 shrink-0">
                  {new Date(t.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="font-medium">{t.description}</span>
                {t.category && (
                  <Badge variant="outline" className="text-xs">
                    {t.category.icon} {t.category.name}
                  </Badge>
                )}
              </div>
              <span
                className={`font-medium tabular-nums ${
                  t.type === "INCOME" ? "text-emerald-600" : "text-foreground"
                }`}
              >
                {t.type === "INCOME" ? "+" : "-"}
                {formatCents(t.amountCents)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
