"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function ignoreRecurringCharge(description: string) {
  await prisma.ignoredRecurringCharge.upsert({
    where: { description },
    create: { description },
    update: {},
  });
  revalidatePath("/spending");
}

export async function unignoreRecurringCharge(description: string) {
  await prisma.ignoredRecurringCharge.deleteMany({ where: { description } });
  revalidatePath("/spending");
}

export async function getIgnoredRecurringCharges() {
  return prisma.ignoredRecurringCharge.findMany({ orderBy: { createdAt: "desc" } });
}
