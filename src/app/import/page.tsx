import { getAccounts } from "@/actions/accounts";
import { ImportWizard } from "@/components/import/ImportWizard";

export default async function ImportPage() {
  const accounts = await getAccounts();

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-2">Import CSV</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Import transactions from a bank or credit card CSV export.
      </p>
      <ImportWizard accounts={accounts} />
    </div>
  );
}
