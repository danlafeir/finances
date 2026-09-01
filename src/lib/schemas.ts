import { z } from "zod";
import { TransactionType, TransactionSource } from "@/generated/prisma/enums";

const BaseTransactionSchema = z.object({
  date: z.string(),
  description: z.string().min(1),
  amountCents: z.number().int().positive(),
  accountId: z.string(),
  categoryId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  source: z.nativeEnum(TransactionSource).optional().default(TransactionSource.MANUAL),
});

export const CreateTransactionInput = z.discriminatedUnion("formType", [
  BaseTransactionSchema.extend({
    formType: z.literal("INCOME"),
    type: z.literal(TransactionType.INCOME),
  }),
  BaseTransactionSchema.extend({
    formType: z.literal("EXPENSE"),
    type: z.literal(TransactionType.EXPENSE),
  }),
  BaseTransactionSchema.extend({
    formType: z.literal("TRANSFER"),
    destinationAccountId: z.string(),
  }),
]);

export type CreateTransactionInput = z.infer<typeof CreateTransactionInput>;
