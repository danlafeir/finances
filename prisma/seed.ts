import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

const DEFAULT_CATEGORIES = [
  { name: "Food & Dining", color: "#f97316", icon: "🍔" },
  { name: "Housing", color: "#8b5cf6", icon: "🏠" },
  { name: "Transportation", color: "#3b82f6", icon: "🚗" },
  { name: "Utilities", color: "#06b6d4", icon: "⚡" },
  { name: "Healthcare", color: "#ec4899", icon: "🏥" },
  { name: "Entertainment", color: "#f59e0b", icon: "🎬" },
  { name: "Shopping", color: "#10b981", icon: "🛍️" },
  { name: "Savings", color: "#6366f1", icon: "💰" },
  { name: "Income", color: "#22c55e", icon: "💵" },
  { name: "Subscriptions", color: "#ef4444", icon: "📱" },
  { name: "Education", color: "#0ea5e9", icon: "📚" },
  { name: "Travel", color: "#d946ef", icon: "✈️" },
  { name: "Other", color: "#6b7280", icon: "📦" },
];

async function main() {
  console.log("Seeding default categories...");
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: { ...cat, isSystem: true },
    });
  }
  console.log(`Seeded ${DEFAULT_CATEGORIES.length} categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
