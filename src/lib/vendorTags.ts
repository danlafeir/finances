import type { VendorTag } from "@/generated/prisma/enums";

export const VENDOR_TAGS: { value: VendorTag; label: string }[] = [
  { value: "BILL", label: "Bill" },
  { value: "SUBSCRIPTION", label: "Subscription" },
  { value: "MEMBERSHIP", label: "Membership" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "UTILITY", label: "Utility" },
  { value: "OTHER", label: "Other" },
];

export const VENDOR_TAG_LABEL: Record<string, string> = Object.fromEntries(
  VENDOR_TAGS.map(({ value, label }) => [value, label])
);
