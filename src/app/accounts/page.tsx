import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { AccountCard } from "@/components/accounts/AccountCard";
import { getAllAccountsWithBalances } from "@/actions/accounts";
import { sortAccounts, ACCOUNT_GROUPS } from "@/lib/accounts";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function AccountsPage() {
  const accounts = sortAccounts(await getAllAccountsWithBalances());

  const grouped = ACCOUNT_GROUPS.map((group) => ({
    ...group,
    accounts: accounts.filter((a) => group.types.includes(a.type)),
  })).filter((g) => g.accounts.length > 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Accounts</h1>
        <Link href="/accounts/new" className={cn(buttonVariants())}>
          <Plus className="h-4 w-4 mr-1" />
          New Account
        </Link>
      </div>

      {accounts.length === 0 ? (
        <p className="text-muted-foreground">No accounts yet. Add your first account to get started.</p>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.label}>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                {group.label}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.accounts.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
