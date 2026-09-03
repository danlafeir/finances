"use client";

import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCents } from "@/lib/money";

interface CapitalGainsChartProps {
  shortTermCents: number;
  longTermCents: number;
}

const SHORT_TERM_COLOR = "#f59e0b"; // ordinary rate
const LONG_TERM_COLOR = "#10b981"; // preferential rate

export function CapitalGainsChart({ shortTermCents, longTermCents }: CapitalGainsChartProps) {
  const data = [
    { name: "Short-Term", valueCents: shortTermCents, color: SHORT_TERM_COLOR },
    { name: "Long-Term", valueCents: longTermCents, color: LONG_TERM_COLOR },
  ];

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={72}
          className="text-xs fill-muted-foreground"
        />
        <ReferenceLine x={0} stroke="var(--border)" />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          formatter={(value) => [formatCents(typeof value === "number" ? value : 0)]}
        />
        <Bar dataKey="valueCents" radius={4}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
