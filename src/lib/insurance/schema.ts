import { z } from "zod";

export const InsuranceCoverage = z.object({
  name: z.string().min(1),
  // Verbatim as stated in the document — "$300,000 per occurrence / $600,000
  // aggregate", "80% coinsurance", "Actual Cash Value" — deliberately a free-text
  // string rather than a numeric type, since limits vary too much in shape to
  // force into cents.
  limit: z.string().min(1),
  deductible: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});
export type InsuranceCoverage = z.infer<typeof InsuranceCoverage>;

export const InsuranceAnalysisInput = z.object({
  policyType: z.string().nullable().optional(), // AI's own read; informational only, never overwrites the policy's own type
  insurer: z.string().nullable().optional(),
  namedInsureds: z.array(z.string()).nullable().optional(),
  effectiveDate: z.string().nullable().optional(), // as printed, not necessarily ISO — display-only
  expirationDate: z.string().nullable().optional(),
  premium: z.string().nullable().optional(), // verbatim ("$1,240/year"); never overwrites the policy's own premiumCents
  summary: z.string().min(1),
  coverages: z.array(InsuranceCoverage).default([]),
  caveats: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  endorsements: z.array(z.string()).default([]),
});
export type InsuranceAnalysisInput = z.infer<typeof InsuranceAnalysisInput>;
