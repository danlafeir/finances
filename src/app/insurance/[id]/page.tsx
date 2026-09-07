import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  getInsurancePolicy,
  listInsuranceDocuments,
  listInsuranceAnalyses,
} from "@/actions/insurance";
import { DeleteInsurancePolicyButton } from "@/components/insurance/DeleteInsurancePolicyButton";
import { InsuranceDocumentUploader } from "@/components/insurance/InsuranceDocumentUploader";
import { DeleteInsuranceDocumentButton } from "@/components/insurance/DeleteInsuranceDocumentButton";
import { InsurancePromptCard } from "@/components/insurance/InsurancePromptCard";
import { InsuranceAnalysisUploader } from "@/components/insurance/InsuranceAnalysisUploader";
import { InsuranceAnalysisView } from "@/components/insurance/InsuranceAnalysisView";
import { InsuranceAnalysisHistory } from "@/components/insurance/InsuranceAnalysisHistory";
import { DeleteInsuranceAnalysisButton } from "@/components/insurance/DeleteInsuranceAnalysisButton";
import { parseStoredAnalysis } from "@/lib/insurance/analysis";
import { buildInsurancePromptTemplate } from "@/lib/insurance/prompt";
import { formatFileSize } from "@/lib/insurance/documents";
import { formatCents } from "@/lib/money";
import { policyTypeLabel, isExpiringSoon, formatDateOnly, PREMIUM_FREQUENCY_LABEL } from "@/lib/insurance/types";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function InsurancePolicyPage({
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

  const [documents, analyses] = await Promise.all([
    listInsuranceDocuments(id),
    listInsuranceAnalyses(id),
  ]);

  const [latest, ...older] = analyses;
  const history = older.map((a) => ({ id: a.id, createdAt: a.createdAt, parsed: parseStoredAnalysis(a.analysisJson) }));
  const latestParsed = latest ? parseStoredAnalysis(latest.analysisJson) : null;

  const status = isExpiringSoon(policy.expirationDate);
  const promptTemplate = buildInsurancePromptTemplate(policyTypeLabel(policy), policy.insurer);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{policyTypeLabel(policy)}</Badge>
          <h1 className="text-2xl font-semibold">{policy.nickname || policy.insurer}</h1>
          {status === "expired" && <Badge variant="destructive">Expired</Badge>}
          {status === "soon" && <Badge className="bg-amber-600 text-white">Expiring soon</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/insurance/${id}/edit`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
          <DeleteInsurancePolicyButton id={id} label={policy.nickname || policy.insurer} redirectTo="/insurance" />
        </div>
      </div>

      <div className="border rounded-lg p-4 grid gap-4 sm:grid-cols-4 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Insurer</p>
          <p className="font-medium">{policy.insurer}</p>
        </div>
        {policy.policyNumber && (
          <div>
            <p className="text-muted-foreground text-xs">Policy Number</p>
            <p className="font-medium">{policy.policyNumber}</p>
          </div>
        )}
        {policy.namedInsureds && (
          <div>
            <p className="text-muted-foreground text-xs">Named Insureds</p>
            <p className="font-medium">{policy.namedInsureds}</p>
          </div>
        )}
        {policy.effectiveDate && (
          <div>
            <p className="text-muted-foreground text-xs">Effective</p>
            <p className="font-medium">
              {formatDateOnly(policy.effectiveDate)}
            </p>
          </div>
        )}
        {policy.expirationDate && (
          <div>
            <p className="text-muted-foreground text-xs">Expires</p>
            <p className="font-medium">
              {formatDateOnly(policy.expirationDate)}
            </p>
          </div>
        )}
        {policy.premiumCents != null && (
          <div>
            <p className="text-muted-foreground text-xs">Premium</p>
            <p className="font-medium">
              {formatCents(policy.premiumCents)}
              {policy.premiumFrequency ? PREMIUM_FREQUENCY_LABEL[policy.premiumFrequency] : ""}
            </p>
          </div>
        )}
        {policy.notes && (
          <div className="sm:col-span-4">
            <p className="text-muted-foreground text-xs">Notes</p>
            <p className="font-medium whitespace-pre-wrap">{policy.notes}</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-medium mb-3">Documents</h2>
        {documents.length > 0 && (
          <div className="border rounded-lg overflow-hidden mb-3">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-muted-foreground text-xs">
                  <th className="text-left py-2 px-3 font-medium">File</th>
                  <th className="text-left py-2 px-3 font-medium">Size</th>
                  <th className="text-left py-2 px-3 font-medium">Uploaded</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id} className="border-t hover:bg-muted/30">
                    <td className="py-2 px-3">
                      <a
                        href={`/api/insurance/documents/${d.id}`}
                        className="hover:underline font-medium"
                      >
                        {d.fileName}
                      </a>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{formatFileSize(d.sizeBytes)}</td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {d.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex justify-end">
                        <DeleteInsuranceDocumentButton id={d.id} fileName={d.fileName} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <InsuranceDocumentUploader policyId={id} />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Coverage Analysis</h2>

        <InsurancePromptCard template={promptTemplate} />
        <InsuranceAnalysisUploader
          policyId={id}
          documents={documents.map((d) => ({ id: d.id, fileName: d.fileName }))}
        />

        {latest && (
          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Latest analysis — {latest.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </p>
              <DeleteInsuranceAnalysisButton id={latest.id} />
            </div>
            {latestParsed?.ok ? (
              <InsuranceAnalysisView analysis={latestParsed.data} />
            ) : (
              <p className="text-sm text-muted-foreground">{latestParsed?.error}</p>
            )}
          </div>
        )}

        <InsuranceAnalysisHistory analyses={history} />
      </div>
    </div>
  );
}
