import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { getTransactions } from "@/actions/transactions";
import { getAccounts } from "@/actions/accounts";
import { getCategories } from "@/actions/categories";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionType } from "@/generated/prisma/enums";

interface PageProps {
  searchParams: Promise<{
    account?: string;
    category?: string;
    type?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const [transactions, accounts, categories] = await Promise.all([
    getTransactions({
      accountId: sp.account,
      categoryId: sp.category,
      type: sp.type as TransactionType | undefined,
      from: sp.from,
      to: sp.to,
    }),
    getAccounts(),
    getCategories(),
  ]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <Link href="/transactions/new" className={cn(buttonVariants())}>
          <Plus className="h-4 w-4 mr-1" />
          New Transaction
        </Link>
      </div>

      <div className="mb-4">
        <Suspense>
          <TransactionFilters accounts={accounts} categories={categories} />
        </Suspense>
      </div>

      <TransactionTable transactions={transactions} showAccount />
    </div>
  );
}
