import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AccountForm } from "@/components/accounts/AccountForm";

export default async function EditAccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await prisma.account.findUnique({
    where: { id },
    include: { vestingEvents: { orderBy: { date: "asc" } } },
  });
  if (!account) notFound();

  const { vestingEvents, ...accountData } = account;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Edit Account</h1>
      <AccountForm account={accountData} vestingEvents={vestingEvents} />
    </div>
  );
}
