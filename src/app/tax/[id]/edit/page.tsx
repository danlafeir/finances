import { notFound } from "next/navigation";
import { getTaxRecord } from "@/actions/tax";
import { getAccounts } from "@/actions/accounts";
import { TaxRecordForm } from "@/components/tax/TaxRecordForm";

export default async function EditTaxRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let record;
  try {
    record = await getTaxRecord(id);
  } catch {
    notFound();
  }

  const accounts = await getAccounts();

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">Edit Tax Record</h1>
      <TaxRecordForm accounts={accounts} record={record} />
    </div>
  );
}
