import { TransactionForm } from "@/components/transactions/TransactionForm";
import { getAccounts } from "@/actions/accounts";
import { getCategories } from "@/actions/categories";

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const sp = await searchParams;
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">New Transaction</h1>
      <TransactionForm
        accounts={accounts}
        categories={categories}
        defaultAccountId={sp.account}
      />
    </div>
  );
}
