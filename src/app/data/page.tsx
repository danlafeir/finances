import Link from "next/link";
import { getDataCoverage } from "@/actions/coverage";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddSnapshotButton } from "@/components/accounts/AddSnapshotButton";
import { DeleteSavedFileButton } from "@/components/accounts/DeleteSavedFileButton";
import { TaxFormUploader } from "@/components/data/TaxFormUploader";
import { ACCOUNT_TYPE_LABEL } from "@/lib/accounts";
import { formatFileSize } from "@/lib/insurance/documents";
import { lastMonthEnd, isoDay, type AccountCoverage, type Need } from "@/lib/coverage";
import { cn } from "@/lib/utils";
import { Download, Upload } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDay(day: string | Date | null): string {
  if (!day) return "—";
  const date = typeof day === "string" ? new Date(`${day}T00:00:00Z`) : day;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

function needText(need: Need): string {
  if (need.kind === "balance") {
    const days = new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(need.asOf.map(formatDay));
    return `Statement balance as of ${days}`;
  }
  return need.from
    ? `Transactions CSV from ${formatDay(need.from)} to ${formatDay(need.to)}`
    : `Transactions CSV for everything through ${formatDay(need.to)}`;
}

function StatusBadge({ status }: { status: AccountCoverage["status"] }) {
  if (status === "current") return <Badge variant="outline">Up to date</Badge>;
  if (status === "automatic") return <Badge variant="outline">Automatic</Badge>;
  return <Badge variant="destructive">Needs data</Badge>;
}

export default async function DataPage() {
  const { today, rows, tax, insurance, hasCreditCard } = await getDataCoverage();
  const target = isoDay(lastMonthEnd(today));
  const ordered = [...rows].sort(
    (a, b) => Number(b.coverage.status === "needs-data") - Number(a.coverage.status === "needs-data")
  );
  const needing = rows.filter((r) => r.coverage.status === "needs-data").length;

  return (
    <div className="p-6 max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          What each account has on file, and what to download next. Everything is checked against the last completed
          month-end, {formatDay(target)}.{" "}
          {needing === 0 ? "Nothing is waiting on you." : `${needing} of ${rows.length} accounts need data.`}
        </p>
        {!hasCreditCard && (
          <p className="text-sm text-muted-foreground mt-1">
            No credit card accounts are tracked, so Spending only covers checking.
          </p>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Accounts</h2>
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No accounts yet.</p>}
        {ordered.map(({ account, coverage: c }) => {
          const isTxAccount = c.type === "CHECKING" || c.type === "CREDIT_CARD";
          return (
            <div key={c.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/accounts/${c.id}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                  <span className="text-sm text-muted-foreground ml-2">{ACCOUNT_TYPE_LABEL[c.type] ?? c.type}</span>
                </div>
                <StatusBadge status={c.status} />
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                <div>
                  <dt className="text-muted-foreground">Balance snapshot</dt>
                  <dd>
                    {c.snapshotDate
                      ? `${formatDay(c.snapshotDate)} (${c.daysSinceSnapshot} days ago)`
                      : "None yet"}
                    <span className="text-muted-foreground"> · {c.snapshotCount} on file</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Transactions</dt>
                  <dd>
                    {c.transactionCount === 0
                      ? "None"
                      : `${c.transactionCount.toLocaleString()} · ${formatDay(c.firstTransactionDate)} – ${formatDay(c.lastTransactionDate)}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Saved statements</dt>
                  <dd>
                    {c.statementCount === 0
                      ? "None"
                      : `${c.statementCount} · latest ${formatDay(c.lastStatementDate)}`}
                  </dd>
                </div>
              </dl>

              {c.need && <p className="text-sm font-medium">Download: {needText(c.need)}</p>}
              {c.reconcileAsOf && c.status !== "automatic" && (
                <p className="text-sm text-muted-foreground">
                  Optional: add the statement balance as of {formatDay(c.reconcileAsOf)} to reconcile. This balance is
                  your last snapshot plus the transactions after it.
                </p>
              )}
              {c.note && <p className="text-sm text-muted-foreground">{c.note}</p>}

              {c.status !== "automatic" && (
                <div className="flex flex-wrap gap-2">
                  <AddSnapshotButton
                    account={account}
                    defaultAsOf={c.need?.kind === "balance" ? c.need.asOf[0] : (c.reconcileAsOf ?? undefined)}
                  />
                  {isTxAccount && (
                    <Link href={`/accounts/${c.id}/import`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                      <Upload className="h-3 w-3 mr-1" />
                      Import CSV
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Tax year {tax.year}</h2>
        <div className="border rounded-lg p-4 space-y-3 text-sm">
          <p>
            Filed return:{" "}
            {tax.hasReturn ? (
              "on file"
            ) : (
              <>
                not entered. <Link href="/tax/return" className="underline">Add it</Link>
              </>
            )}
          </p>
          {tax.forms.length === 0 ? (
            <p className="text-muted-foreground">No accounts here normally issue a 1099 or 1098.</p>
          ) : (
            <ul className="space-y-2">
              {tax.forms.map((f) => (
                <li key={f.formType}>
                  <span className="font-medium">{f.label}</span>
                  <span className="text-muted-foreground">
                    {" "}— {f.recordCount === 0 ? "none entered" : `${f.recordCount} entered`}; usually issued for{" "}
                    {f.expectedFor.join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-start gap-3">
            <Link href={`/tax/add`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Enter tax data
            </Link>
            <TaxFormUploader taxYear={tax.year} />
          </div>
          {tax.files.length > 0 && (
            <div className="space-y-1">
              <p className="text-muted-foreground">Saved copies</p>
              {tax.files.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 py-1 px-3 rounded-md hover:bg-muted/50">
                  <span className="truncate">
                    {f.fileName} <span className="text-muted-foreground">· {formatFileSize(f.sizeBytes)}</span>
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={`/api/files/${f.id}`} aria-label={`Download ${f.fileName}`} className="p-2 rounded-md hover:bg-muted">
                      <Download className="h-3.5 w-3.5" />
                    </a>
                    <DeleteSavedFileButton id={f.id} fileName={f.fileName} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {insurance.policies > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-medium">Insurance</h2>
          <p className="text-sm text-muted-foreground">
            {insurance.undocumented === 0
              ? `All ${insurance.policies} policies have a saved document.`
              : `${insurance.undocumented} of ${insurance.policies} policies have no saved document.`}{" "}
            <Link href="/insurance" className="underline">Open Insurance</Link>
          </p>
        </section>
      )}
    </div>
  );
}
