import { SetupForm } from "@/components/settings/SetupForm";

export default function SettingsPage() {
  return (
    <div className="p-6 w-full max-w-xl">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      <SetupForm />
    </div>
  );
}
