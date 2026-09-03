import type { AccountTaxGuidance } from "@/lib/tax/accountGuidance";

export function TaxGuidanceBody({ guidance }: { guidance: AccountTaxGuidance }) {
  return (
    <>
      <p className="text-sm">{guidance.summary}</p>
      {guidance.notes.length > 0 && (
        <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
          {guidance.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
      {guidance.decisions.length > 0 && (
        <div className="pt-1 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Common decisions
          </p>
          <dl className="space-y-2">
            {guidance.decisions.map((d) => (
              <div key={d.title} className="text-sm">
                <dt className="font-medium">{d.title}</dt>
                <dd className="text-muted-foreground">{d.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </>
  );
}
