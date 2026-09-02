"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatCents } from "@/lib/money";
import type { MonthlyTotal } from "@/actions/spending";

interface MonthlySpendingChartProps {
  data: MonthlyTotal[];
}

export function MonthlySpendingChart({ data }: MonthlySpendingChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          className="text-xs fill-muted-foreground"
        />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          formatter={(value) => [formatCents(typeof value === "number" ? value : 0), "Spent"]}
        />
        <Bar dataKey="totalCents" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
