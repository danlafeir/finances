import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAccountWithBalance } from "@/actions/accounts";
import { prisma } from "@/lib/prisma";
import { Pencil } from "lucide-react";
import { DeleteAccountButton } from "@/components/accounts/DeleteAccountButton";
import { cn } from "@/lib/utils";
import { ACCOUNT_TYPE_LABEL } from "@/lib/accounts";
import { getMortgageDetails } from "@/actions/mortgage";
import { formatCents } from "@/lib/money";
import { getCurrentBalanceCents } from "@/lib/mortgage";

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

  const mortgage = account.type === "MORTGAGE" ? await getMortgageDetails(id) : null;

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

      {mortgage && (() => {
        const payments = mortgage.payments.map((p) => ({
          paymentNumber: p.paymentNumber,
          paymentDate: new Date(p.paymentDate).toISOString().slice(0, 10),
          paymentCents: p.paymentCents,
          principalCents: p.principalCents,
          interestCents: p.interestCents,
          balanceCents: p.balanceCents,
        }));
        const currentBalance = getCurrentBalanceCents(payments, mortgage.principalCents);
        const equity = mortgage.homeValueCents - currentBalance;
        const paidOff = Math.round(((mortgage.principalCents - currentBalance) / mortgage.principalCents) * 100);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const nextPayment = payments.find((p) => new Date(p.paymentDate) > today);
        const rate = (mortgage.annualRateBps / 100).toFixed(3);

        return (
          <div className="mb-6 border rounded-lg p-4 space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">Mortgage Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Home Value</p>
                <p className="font-semibold tabular-nums">{formatCents(mortgage.homeValueCents)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Remaining Balance</p>
                <p className="font-semibold tabular-nums">{formatCents(currentBalance)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Equity</p>
                <p className={`font-semibold tabular-nums ${equity >= 0 ? "text-primary" : "text-destructive"}`}>
                  {formatCents(equity)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Monthly Payment</p>
                <p className="font-semibold tabular-nums">{formatCents(mortgage.monthlyPaymentCents)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Rate</p>
                <p className="font-semibold">{rate}%</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Term</p>
                <p className="font-semibold">{mortgage.termMonths / 12} years</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Paid Off</p>
                <p className="font-semibold">{paidOff}%</p>
              </div>
              {nextPayment && (
                <div>
                  <p className="text-muted-foreground text-xs">Next Payment</p>
                  <p className="font-semibold">
                    {new Date(nextPayment.paymentDate).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>
            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Original loan: {formatCents(mortgage.principalCents)}</span>
                <span>{paidOff}% paid</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(paidOff, 100)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })()}

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
