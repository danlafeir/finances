"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const CategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export async function createCategory(data: z.infer<typeof CategorySchema>) {
  const parsed = CategorySchema.parse(data);
  const category = await prisma.category.create({ data: { ...parsed, isSystem: false } });
  revalidatePath("/categories");
  return category;
}

export async function updateCategory(id: string, data: z.infer<typeof CategorySchema>) {
  const parsed = CategorySchema.parse(data);
  const category = await prisma.category.update({ where: { id }, data: parsed });
  revalidatePath("/categories");
  return category;
}

export async function deleteCategory(id: string) {
  const cat = await prisma.category.findUniqueOrThrow({ where: { id } });
  if (cat.isSystem) throw new Error("Cannot delete a system category.");
  await prisma.category.delete({ where: { id } });
  revalidatePath("/categories");
}

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}
