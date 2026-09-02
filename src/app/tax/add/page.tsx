import { getAccounts } from "@/actions/accounts";
import { TaxAddView } from "@/components/tax/TaxAddView";

interface PageProps {
  searchParams: Promise<{ accountId?: string; formType?: string }>;
}

export default async function TaxAddPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const accounts = await getAccounts();

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">Add Tax Data</h1>
      <TaxAddView accounts={accounts} defaultAccountId={sp.accountId} defaultFormType={sp.formType} />
    </div>
  );
}
