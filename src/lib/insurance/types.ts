import type { InsurancePolicyType } from "@/generated/prisma/enums";

export const INSURANCE_POLICY_TYPES: { value: InsurancePolicyType; label: string }[] = [
  { value: "AUTO", label: "Auto" },
  { value: "HOME", label: "Home" },
  { value: "RENTERS", label: "Renters" },
  { value: "HEALTH", label: "Health" },
  { value: "LIFE", label: "Life" },
  { value: "UMBRELLA", label: "Umbrella" },
  { value: "DISABILITY", label: "Disability" },
  { value: "PET", label: "Pet" },
  { value: "OTHER", label: "Other" },
];

export const INSURANCE_POLICY_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  INSURANCE_POLICY_TYPES.map(({ value, label }) => [value, label])
);

export const PREMIUM_FREQUENCY_LABEL: Record<string, string> = {
  MONTHLY: "/month",
  QUARTERLY: "/quarter",
  SEMI_ANNUAL: "/6 months",
  ANNUAL: "/year",
  OTHER: "",
};

interface PolicyLike {
  type: string;
  typeOtherLabel?: string | null;
}

export function policyTypeLabel(policy: PolicyLike): string {
  if (policy.type === "OTHER" && policy.typeOtherLabel) return policy.typeOtherLabel;
  return INSURANCE_POLICY_TYPE_LABEL[policy.type] ?? policy.type;
}

/**
 * Groups and orders policies by type in JS, not SQL — SQLite stores the enum as
 * TEXT, so `ORDER BY type` would sort "OTHER" alphabetically between "LIFE" and
 * "PET" instead of last.
 */
export function groupPoliciesByType<T extends PolicyLike>(
  policies: T[]
): { type: string; label: string; policies: T[] }[] {
  return INSURANCE_POLICY_TYPES.map(({ value, label }) => ({
    type: value,
    label,
    policies: policies.filter((p) => p.type === value),
  })).filter((group) => group.policies.length > 0);
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Compares date-only strings, not Date-vs-`new Date()` instants — expirationDate
 * is stored as UTC midnight, so a naive Date comparison can flip the badge a day
 * early/late depending on the viewer's local timezone offset.
 */
export function isExpiringSoon(
  expirationDate: Date | string | null,
  thresholdDays = 30
): "expired" | "soon" | null {
  if (!expirationDate) return null;

  const expiry = typeof expirationDate === "string" ? expirationDate.slice(0, 10) : dateOnly(expirationDate);
  const today = dateOnly(new Date());
  if (expiry < today) return "expired";

  const threshold = new Date();
  threshold.setDate(threshold.getDate() + thresholdDays);
  if (expiry <= dateOnly(threshold)) return "soon";

  return null;
}
