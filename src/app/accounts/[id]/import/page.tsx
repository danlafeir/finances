import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { ImportWizard } from "@/components/import/ImportWizard";
import { ClearTransactionsButton } from "@/components/accounts/ClearTransactionsButton";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

export default async function AccountImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const account = await prisma.account.findUnique({ where: { id } });

  if (!account || (account.type !== "CHECKING" && account.type !== "CREDIT_CARD")) {
    notFound();
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/accounts/${id}`}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {account.name}
          </Link>
          <h1 className="text-2xl font-semibold">Import Transactions</h1>
        </div>
        <ClearTransactionsButton accountId={id} />
      </div>
      <ImportWizard accounts={[account]} redirectTo={`/accounts/${id}`} />
    </div>
  );
}
