import { formatCents } from "@/lib/money";
import type { AnomalyItem } from "@/actions/spending";

interface AnomaliesTableProps {
  items: AnomalyItem[];
}

export function AnomaliesTable({ items }: AnomaliesTableProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground px-6 py-4">
        Nothing noticeably higher than usual this month.
      </p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-xs text-muted-foreground">
          <th className="text-left py-2 px-6 font-medium">Description</th>
          <th className="text-right py-2 px-3 font-medium">This Month</th>
          <th className="text-right py-2 px-3 font-medium">3-mo Avg</th>
          <th className="text-right py-2 px-6 font-medium">Delta</th>
        </tr>
      </thead>
      <tbody>
        {items.map((a) => (
          <tr key={a.description} className="border-b last:border-0 hover:bg-muted/30">
            <td className="py-2 px-6">{a.description}</td>
            <td className="py-2 px-3 text-right tabular-nums text-destructive">
              {formatCents(a.currentCents)}
            </td>
            <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
              {formatCents(a.avgCents)}
            </td>
            <td className="py-2 px-6 text-right tabular-nums font-medium text-destructive">
              +{formatCents(a.deltaCents)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
