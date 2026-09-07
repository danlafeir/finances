"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { InsurancePolicyInput } from "@/lib/schemas";
import { InsuranceAnalysisInput } from "@/lib/insurance/schema";
import { extractJsonObject, mapZodIssues, type FieldIssue } from "@/lib/insurance/analysis";
import { isAcceptedFile } from "@/lib/insurance/documents";

export async function createInsurancePolicy(data: InsurancePolicyInput) {
  const parsed = InsurancePolicyInput.parse(data);
  const created = await prisma.insurancePolicy.create({
    data: {
      ...parsed,
      effectiveDate: parsed.effectiveDate ? new Date(parsed.effectiveDate) : null,
      expirationDate: parsed.expirationDate ? new Date(parsed.expirationDate) : null,
    },
  });

  revalidatePath("/insurance");
  return created;
}

export async function updateInsurancePolicy(id: string, data: InsurancePolicyInput) {
  const parsed = InsurancePolicyInput.parse(data);
  const updated = await prisma.insurancePolicy.update({
    where: { id },
    data: {
      ...parsed,
      effectiveDate: parsed.effectiveDate ? new Date(parsed.effectiveDate) : null,
      expirationDate: parsed.expirationDate ? new Date(parsed.expirationDate) : null,
    },
  });

  revalidatePath("/insurance");
  revalidatePath(`/insurance/${id}`);
  return updated;
}

export async function deleteInsurancePolicy(id: string) {
  await prisma.insurancePolicy.delete({ where: { id } });
  revalidatePath("/insurance");
}

export async function getInsurancePolicies() {
  return prisma.insurancePolicy.findMany({
    orderBy: [{ insurer: "asc" }, { nickname: "asc" }],
  });
}

export async function getInsurancePolicy(id: string) {
  return prisma.insurancePolicy.findUniqueOrThrow({ where: { id } });
}

export async function uploadInsuranceDocument(policyId: string, formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No file was provided.");
  }

  const check = isAcceptedFile(file);
  if (!check.ok) {
    throw new Error(check.error);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const document = await prisma.insuranceDocument.create({
    data: {
      policyId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: buffer.length,
      blob: { create: { data: buffer } },
    },
    select: { id: true, policyId: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true },
  });

  revalidatePath(`/insurance/${policyId}`);
  return document;
}

export async function listInsuranceDocuments(policyId: string) {
  return prisma.insuranceDocument.findMany({
    where: { policyId },
    select: { id: true, policyId: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteInsuranceDocument(id: string) {
  const existing = await prisma.insuranceDocument.findUniqueOrThrow({
    where: { id },
    select: { policyId: true },
  });
  await prisma.insuranceDocument.delete({ where: { id } });
  revalidatePath(`/insurance/${existing.policyId}`);
}

export type SubmitInsuranceAnalysisResult =
  | { success: true; analysis: { id: string; policyId: string; documentId: string | null; createdAt: Date } }
  | { success: false; errors: FieldIssue[] };

export async function submitInsuranceAnalysis(
  policyId: string,
  documentId: string | null,
  rawJson: string
): Promise<SubmitInsuranceAnalysisResult> {
  let candidate: unknown;
  try {
    candidate = JSON.parse(extractJsonObject(rawJson));
  } catch {
    return { success: false, errors: [{ path: "(root)", message: "Could not parse that as JSON." }] };
  }

  const result = InsuranceAnalysisInput.safeParse(candidate);
  if (!result.success) {
    return { success: false, errors: mapZodIssues(result.error.issues) };
  }

  if (documentId) {
    const document = await prisma.insuranceDocument.findUnique({
      where: { id: documentId },
      select: { policyId: true },
    });
    if (!document || document.policyId !== policyId) {
      throw new Error("That document does not belong to this policy.");
    }
  }

  const created = await prisma.insuranceAnalysis.create({
    data: {
      policyId,
      documentId,
      analysisJson: JSON.stringify(result.data),
    },
    select: { id: true, policyId: true, documentId: true, createdAt: true },
  });

  revalidatePath(`/insurance/${policyId}`);
  return { success: true, analysis: created };
}

export async function listInsuranceAnalyses(policyId: string) {
  return prisma.insuranceAnalysis.findMany({
    where: { policyId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteInsuranceAnalysis(id: string) {
  const existing = await prisma.insuranceAnalysis.findUniqueOrThrow({
    where: { id },
    select: { policyId: true },
  });
  await prisma.insuranceAnalysis.delete({ where: { id } });
  revalidatePath(`/insurance/${existing.policyId}`);
}
