import { getTaxReturnSummary } from "@/actions/tax";
import { TaxReturnForm } from "@/components/tax/TaxReturnForm";
import { TaxPromptCard } from "@/components/tax/TaxPromptCard";
import { TAX_RETURN_CSV_TEMPLATE } from "@/lib/tax/returnCsv";

interface PageProps {
  searchParams: Promise<{ year?: string }>;
}

function defaultTaxYear(): number {
  return new Date().getFullYear() - 1;
}

export default async function TaxReturnPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const taxYear = sp.year ? parseInt(sp.year, 10) : defaultTaxYear();
  const summary = await getTaxReturnSummary(taxYear);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold">{summary ? "Edit" : "Add"} Filed Tax Return</h1>
        <p className="text-sm text-muted-foreground mt-1">
          One record per tax year — figures come from your filed federal Form 1040, not from any
          single 1099 or 1098. This app never stores the return itself.
        </p>
      </div>

      <TaxPromptCard template={TAX_RETURN_CSV_TEMPLATE} />
      <TaxReturnForm summary={summary} defaultYear={taxYear} />
    </div>
  );
}
