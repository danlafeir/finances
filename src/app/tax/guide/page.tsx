import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ACCOUNT_GROUPS, ACCOUNT_TYPE_LABEL } from "@/lib/accounts";
import { ACCOUNT_TAX_GUIDANCE } from "@/lib/tax/accountGuidance";
import { TaxGuidanceBody } from "@/components/tax/TaxGuidanceBody";
import type { AccountType } from "@/generated/prisma/enums";

const CROSS_CUTTING_NOTES: { title: string; detail: string }[] = [
  {
    title: "Capital losses",
    detail:
      "Net short-term losses against short-term gains, long-term against long-term, then the two net results against each other. Up to $3,000/year of a remaining net loss offsets ordinary income; anything beyond that carries forward indefinitely to future years.",
  },
  {
    title: "Standard vs. itemized deduction",
    detail:
      "Itemizing only helps once mortgage interest + state/local taxes (SALT — raised from a $10,000 cap to a $40,000 base for 2025 by 2025's tax law, growing ~1%/year through 2029, phased down above $500,000 MAGI, and reverting to $10,000 in 2030) + charitable giving + other itemized items exceed the standard deduction. Below that, itemized deductions like mortgage interest aren't actually reducing your tax.",
  },
  {
    title: "Net Investment Income Tax (NIIT)",
    detail:
      "An additional 3.8% surtax on interest, dividends, capital gains, and other investment income once MAGI exceeds $200,000 (single) / $250,000 (married filing jointly). Wages aren't subject to it, but they do count toward the MAGI threshold.",
  },
  {
    title: "Wash sale rule spans all your accounts",
    detail:
      "Harvesting a loss in a taxable brokerage account while buying the same or a substantially identical security in a retirement account (yours or a spouse's) within 30 days still triggers the wash sale disallowance — the rule isn't limited to the account where you sold.",
  },
  {
    title: "Estimated taxes",
    detail:
      "Income without withholding — dividends, capital gains, RSU sales that outpace default withholding, self-employment income — can require quarterly estimated payments to avoid an underpayment penalty.",
  },
  {
    title: "Prior-year contribution deadlines",
    detail:
      "IRA and HSA contributions for a given tax year can still be made up until that year's filing deadline (typically April 15 of the following year) — a late realization you're eligible doesn't mean the window is closed.",
  },
];

export default function TaxGuidePage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/tax"
            className="text-xs text-muted-foreground hover:underline flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Tax
          </Link>
          <h1 className="text-2xl font-semibold">Tax Guide</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aggregated, concise notes on the tax character of each account type and the
            decisions that commonly come up. General information, not tax advice — confirm
            anything you rely on with a tax professional or the current-year IRS rules.
          </p>
        </div>
      </div>

      <details className="group border rounded-lg p-4">
        <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <h2 className="text-base font-medium">Cross-Cutting Rules Worth Remembering</h2>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <dl className="space-y-3 pt-3">
          {CROSS_CUTTING_NOTES.map((n) => (
            <div key={n.title} className="text-sm">
              <dt className="font-medium">{n.title}</dt>
              <dd className="text-muted-foreground">{n.detail}</dd>
            </div>
          ))}
        </dl>
      </details>

      {ACCOUNT_GROUPS.map((group) => (
        <div key={group.label} className="space-y-3">
          <div>
            <h2 className="text-lg font-medium">{group.label}</h2>
            {group.subtitle && (
              <p className="text-xs text-muted-foreground">{group.subtitle}</p>
            )}
          </div>
          <div className="space-y-3">
            {group.types.map((type) => {
              const guidance = ACCOUNT_TAX_GUIDANCE[type as AccountType];
              return (
                <details key={type} id={type} className="group border rounded-lg p-4">
                  <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <h3 className="text-sm font-semibold">
                      {ACCOUNT_TYPE_LABEL[type] ?? type}
                    </h3>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="space-y-2 pt-3">
                    <TaxGuidanceBody guidance={guidance} />
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex justify-end">
        <Link href="/tax" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Back to Tax
        </Link>
      </div>
    </div>
  );
}
