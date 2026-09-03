"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCents } from "@/lib/money";

// Fixed-order categorical palette (validated: node scripts/validate_palette.js —
// all hard gates pass; contrast WARN on slots 3/4/5 is mitigated by the legend +
// tooltip always carrying the series name as text, never color alone).
const CATEGORICAL_PALETTE = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
];

export interface GrowthSeries {
  id: string;
  name: string;
  points: { date: Date; balanceCents: number }[];
}

interface AccountGrowthChartProps {
  series: GrowthSeries[];
}

export function AccountGrowthChart({ series }: AccountGrowthChartProps) {
  if (series.length === 0) return null;

  const shown = series.slice(0, CATEGORICAL_PALETTE.length);
  const overflow = series.length - shown.length;
  const sparse = shown.every((s) => s.points.length <= 1);

  const dateSet = new Set<string>();
  for (const s of shown) {
    for (const p of s.points) dateSet.add(p.date.toISOString().slice(0, 10));
  }
  const dates = Array.from(dateSet).sort();

  const data = dates.map((d) => {
    const row: Record<string, number | string> = { date: d };
    for (const s of shown) {
      const point = s.points.find((p) => p.date.toISOString().slice(0, 10) === d);
      if (point) row[s.id] = point.balanceCents;
    }
    return row;
  });

  return (
    <div>
      {sparse && (
        <p className="text-xs text-muted-foreground mb-2">
          Each account has a single balance snapshot so far — add another snapshot later to see a trend line.
        </p>
      )}
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            className="text-xs fill-muted-foreground"
            tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" })}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            className="text-xs fill-muted-foreground"
            tickFormatter={(v) => formatCents(v)}
            width={84}
          />
          <Tooltip
            labelFormatter={(d) =>
              new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
            }
            formatter={(value, name) => [formatCents(typeof value === "number" ? value : 0), name]}
          />
          {shown.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {shown.map((s, i) => (
            <Line
              key={s.id}
              type="monotone"
              dataKey={s.id}
              name={s.name}
              stroke={CATEGORICAL_PALETTE[i]}
              strokeWidth={2}
              dot={{ r: 4, fill: CATEGORICAL_PALETTE[i], stroke: "var(--background)", strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {overflow > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Showing the first {shown.length} accounts; {overflow} more not shown.
        </p>
      )}
    </div>
  );
}
