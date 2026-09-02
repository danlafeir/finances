"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { VendorTag } from "@/generated/prisma/enums";

const VendorLabelSchema = z.object({
  description: z.string().min(1).trim(),
  label: z.string().min(1).trim(),
  tag: z.enum(VendorTag),
});

export async function upsertVendorLabel(description: string, label: string, tag: VendorTag) {
  const parsed = VendorLabelSchema.parse({ description, label, tag });
  const result = await prisma.vendorLabel.upsert({
    where: { description: parsed.description },
    create: parsed,
    update: { label: parsed.label, tag: parsed.tag },
  });
  revalidatePath("/spending");
  return result;
}

export async function deleteVendorLabel(description: string) {
  await prisma.vendorLabel.deleteMany({ where: { description } });
  revalidatePath("/spending");
}

export async function getAllVendorLabels() {
  return prisma.vendorLabel.findMany();
}
