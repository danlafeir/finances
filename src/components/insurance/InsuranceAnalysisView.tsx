import type { InsuranceAnalysisInput } from "@/lib/insurance/schema";

export function InsuranceAnalysisView({ analysis }: { analysis: InsuranceAnalysisInput }) {
  return (
    <div className="space-y-4">
      <p className="text-sm">{analysis.summary}</p>

      {analysis.coverages.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-muted-foreground text-xs">
                <th className="text-left py-2 px-3 font-medium">Coverage</th>
                <th className="text-left py-2 px-3 font-medium">Limit</th>
                <th className="text-left py-2 px-3 font-medium">Deductible</th>
                <th className="text-left py-2 px-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {analysis.coverages.map((c, i) => (
                <tr key={i} className="border-t align-top">
                  <td className="py-2 px-3 font-medium whitespace-nowrap">{c.name}</td>
                  <td className="py-2 px-3">{c.limit}</td>
                  <td className="py-2 px-3">{c.deductible || <span className="text-muted-foreground">—</span>}</td>
                  <td className="py-2 px-3 text-muted-foreground">{c.description || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No coverages were parsed from this analysis.</p>
      )}

      {analysis.caveats.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-1">Caveats</p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-0.5">
            {analysis.caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis.exclusions.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-1">Exclusions</p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-0.5">
            {analysis.exclusions.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {analysis.endorsements.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-1">Endorsements</p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-0.5">
            {analysis.endorsements.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
