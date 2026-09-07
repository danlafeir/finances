import { notFound } from "next/navigation";
import { getInsurancePolicy } from "@/actions/insurance";
import { InsurancePolicyForm } from "@/components/insurance/InsurancePolicyForm";

export default async function EditInsurancePolicyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let policy;
  try {
    policy = await getInsurancePolicy(id);
  } catch {
    notFound();
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">Edit Policy</h1>
      <InsurancePolicyForm record={policy} />
    </div>
  );
}
