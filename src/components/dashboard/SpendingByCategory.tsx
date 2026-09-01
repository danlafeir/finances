"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface SpendingByCategoryProps {
  data: { name: string; icon: string; valueCents: number }[];
}

const COLORS = [
  "#f97316", "#8b5cf6", "#3b82f6", "#06b6d4", "#ec4899",
  "#f59e0b", "#22c55e", "#10b981", "#6366f1", "#ef4444",
];

export function SpendingByCategory({ data }: SpendingByCategoryProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={85}
          dataKey="valueCents"
          nameKey="name"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [`$${(Number(v) / 100).toFixed(2)}`]} />
        <Legend formatter={(name) => name} />
      </PieChart>
    </ResponsiveContainer>
  );
}
