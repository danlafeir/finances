import { AccountForm } from "@/components/accounts/AccountForm";

export default function NewAccountPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">New Account</h1>
      <AccountForm />
    </div>
  );
}
