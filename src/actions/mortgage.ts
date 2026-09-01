"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { MortgageData } from "@/lib/mortgage";

export async function saveMortgageDetails(accountId: string, data: MortgageData) {
  await prisma.$transaction(async (tx) => {
    const details = await tx.mortgageDetails.upsert({
      where: { accountId },
      create: {
        accountId,
        homeValueCents: data.homeValueCents,
        principalCents: data.principalCents,
        annualRateBps: data.annualRateBps,
        termMonths: data.termMonths,
        originationDate: new Date(data.originationDate),
        monthlyPaymentCents: data.monthlyPaymentCents,
      },
      update: {
        homeValueCents: data.homeValueCents,
        principalCents: data.principalCents,
        annualRateBps: data.annualRateBps,
        termMonths: data.termMonths,
        originationDate: new Date(data.originationDate),
        monthlyPaymentCents: data.monthlyPaymentCents,
      },
    });

    await tx.mortgagePayment.deleteMany({ where: { mortgageId: details.id } });

    if (data.payments.length > 0) {
      await tx.mortgagePayment.createMany({
        data: data.payments.map((p) => ({
          mortgageId: details.id,
          paymentNumber: p.paymentNumber,
          paymentDate: new Date(p.paymentDate),
          paymentCents: p.paymentCents,
          principalCents: p.principalCents,
          interestCents: p.interestCents,
          balanceCents: p.balanceCents,
        })),
      });
    }
  });

  revalidatePath("/accounts");
  revalidatePath(`/accounts/${accountId}`);
}

export async function getMortgageDetails(accountId: string) {
  return prisma.mortgageDetails.findUnique({
    where: { accountId },
    include: { payments: { orderBy: { paymentNumber: "asc" } } },
  });
}
