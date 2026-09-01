"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface AllocationChartProps {
  data: { name: string; valueCents: number }[];
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#f59e0b", "#22c55e", "#10b981", "#06b6d4", "#3b82f6",
];

export function AllocationChart({ data }: AllocationChartProps) {
  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.valueCents, 0);
  const chartData = data.map((d) => ({
    name: d.name,
    value: d.valueCents,
    pct: total > 0 ? ((d.valueCents / total) * 100).toFixed(1) : "0",
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          dataKey="value"
          nameKey="name"
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => {
            const num = typeof value === "number" ? value : 0;
            return [`$${(num / 100).toFixed(2)}`];
          }}
        />
        <Legend
          formatter={(value, entry) => {
            const item = entry.payload as { pct: string } | undefined;
            return `${value} (${item?.pct ?? "0"}%)`;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
