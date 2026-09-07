import { InsurancePolicyForm } from "@/components/insurance/InsurancePolicyForm";

export default function NewInsurancePolicyPage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">Add Policy</h1>
      <InsurancePolicyForm />
    </div>
  );
}
