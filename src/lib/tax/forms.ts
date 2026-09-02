import type { AccountType } from "@/generated/prisma/enums";

export const TAX_FORM_TYPES = [
  { value: "FORM_1099_INT", label: "1099-INT — Interest Income" },
  { value: "FORM_1099_DIV_B", label: "1099-DIV/B — Dividends & Capital Gains" },
  { value: "FORM_1098", label: "1098 — Mortgage Interest" },
] as const;

export const TAX_FORM_LABEL: Record<string, string> = Object.fromEntries(
  TAX_FORM_TYPES.map(({ value, label }) => [value, label])
);

export const TAX_FORM_ELIGIBLE_ACCOUNT_TYPES: Record<string, AccountType[]> = {
  FORM_1099_INT: ["CHECKING", "CASH"],
  FORM_1099_DIV_B: ["TAXABLE_BROKERAGE"],
  FORM_1098: ["MORTGAGE"],
};

export const TAX_ELIGIBLE_ACCOUNT_TYPES = new Set(
  Object.values(TAX_FORM_ELIGIBLE_ACCOUNT_TYPES).flat()
);

export function eligibleAccountsFor<T extends { type: string }>(formType: string, accounts: T[]): T[] {
  const types = TAX_FORM_ELIGIBLE_ACCOUNT_TYPES[formType] ?? [];
  return accounts.filter((a) => types.includes(a.type as AccountType));
}
