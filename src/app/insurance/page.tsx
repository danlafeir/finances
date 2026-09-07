import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getInsurancePolicies } from "@/actions/insurance";
import { formatCents } from "@/lib/money";
import { groupPoliciesByType, policyTypeLabel, isExpiringSoon, formatDateOnly, PREMIUM_FREQUENCY_LABEL } from "@/lib/insurance/types";
import { cn } from "@/lib/utils";

export default async function InsurancePage() {
  const policies = await getInsurancePolicies();
  const groups = groupPoliciesByType(policies);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Insurance</h1>
        <Link href="/insurance/new" className={cn(buttonVariants({ size: "sm" }))}>
          Add Policy
        </Link>
      </div>

      {policies.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No policies yet. Add one to upload the policy document and get a plain-English
          breakdown of what it covers.
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.type}>
              <h2 className="text-lg font-medium mb-3">
                {group.label} <span className="text-muted-foreground text-sm font-normal">({group.policies.length})</span>
              </h2>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-muted-foreground text-xs">
                      <th className="text-left py-2 px-3 font-medium">Policy</th>
                      <th className="text-left py-2 px-3 font-medium">Insurer</th>
                      <th className="text-right py-2 px-3 font-medium">Premium</th>
                      <th className="text-left py-2 px-3 font-medium">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.policies.map((p) => {
                      const status = isExpiringSoon(p.expirationDate);
                      return (
                        <tr key={p.id} className="border-t hover:bg-muted/30">
                          <td className="py-2 px-3">
                            <Link href={`/insurance/${p.id}`} className="hover:underline font-medium">
                              {p.nickname || policyTypeLabel(p)}
                            </Link>
                            {p.policyNumber && (
                              <span className="text-muted-foreground text-xs ml-2">#{p.policyNumber}</span>
                            )}
                          </td>
                          <td className="py-2 px-3">{p.insurer}</td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            {p.premiumCents != null ? (
                              <>
                                {formatCents(p.premiumCents)}
                                <span className="text-muted-foreground">
                                  {p.premiumFrequency ? PREMIUM_FREQUENCY_LABEL[p.premiumFrequency] : ""}
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              {p.expirationDate
                                ? formatDateOnly(p.expirationDate)
                                : <span className="text-muted-foreground">—</span>}
                              {status === "expired" && <Badge variant="destructive">Expired</Badge>}
                              {status === "soon" && <Badge className="bg-amber-600 text-white">Expiring soon</Badge>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
