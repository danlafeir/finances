const EXAMPLE_JSON = `{
  "policyType": "Auto",
  "insurer": "State Farm",
  "namedInsureds": ["Jane Doe"],
  "effectiveDate": "2026-01-01",
  "expirationDate": "2027-01-01",
  "premium": "$1,240 / year",
  "summary": "This policy covers liability, collision, and comprehensive damage for one vehicle, with roadside assistance included. It does not cover rideshare/delivery driving or damage from flooding.",
  "coverages": [
    {
      "name": "Bodily Injury Liability",
      "limit": "$100,000 per person / $300,000 per accident",
      "deductible": null,
      "description": "Covers injuries you cause to others while driving."
    },
    {
      "name": "Collision",
      "limit": "Actual Cash Value",
      "deductible": "$500",
      "description": "Covers damage to your own vehicle from a collision."
    }
  ],
  "caveats": [
    "Roadside assistance is capped at 3 uses per policy period."
  ],
  "exclusions": [
    "Driving for a rideshare or delivery service (e.g. Uber, DoorDash) while a passenger or delivery is active.",
    "Damage from flooding — see the separate flood policy section, if any."
  ],
  "endorsements": [
    "Roadside Assistance rider added 2026-01-01"
  ]
}`;

export interface InsurancePromptTemplate {
  promptText: string;
  exampleJson: string;
}

/**
 * One universal prompt for every policy type — unlike tax forms, insurance
 * coverage categories are freeform per policy/insurer rather than fixed IRS boxes,
 * so a single adaptable template (with the policy's own type/insurer interpolated
 * into the intro) covers auto/home/life/etc. equally well.
 */
export function buildInsuranceAnalysisPrompt(policyTypeLabel: string, insurer?: string | null): string {
  const subject = insurer ? `my ${policyTypeLabel.toLowerCase()} insurance policy from ${insurer}` : `my ${policyTypeLabel.toLowerCase()} insurance policy`;

  return `You are analyzing ${subject} so I can understand what it covers. I am attaching the policy document (declarations page, full policy, and/or any endorsements).

Read only what is printed in the document. Output a single JSON object with EXACTLY these fields, and nothing else:

{
  "policyType": string | null,        // your own read of the policy type, e.g. "Auto", "Homeowners"
  "insurer": string | null,
  "namedInsureds": string[] | null,   // names covered, as printed
  "effectiveDate": string | null,     // as printed on the document
  "expirationDate": string | null,    // as printed on the document
  "premium": string | null,           // as printed, e.g. "$1,240 / year" — do not compute or convert it
  "summary": string,                  // REQUIRED — 2 to 4 plain-English sentences covering what's covered and the biggest gaps
  "coverages": [
    {
      "name": string,                 // the coverage line item's name, as printed
      "limit": string,                // the limit language exactly as printed — e.g. "$300,000 per occurrence / $600,000 aggregate", "80% coinsurance", "Actual Cash Value" — do NOT normalize, convert, or round it
      "deductible": string | null,    // as printed, or null if none applies
      "description": string | null    // one plain-English sentence on what this coverage actually pays for
    }
  ],
  "caveats": string[],                // notable limitations, conditions, or gotchas — one bullet per item, in the document's own language, not paraphrased into a single paragraph
  "exclusions": string[],             // things explicitly NOT covered — one bullet per item
  "endorsements": string[]            // riders/endorsements attached to the policy, if any; omit or leave empty if none
}

Rules — follow all of them exactly:
1. Output ONLY the JSON object. No explanation, no markdown code fences, no commentary before or after it.
2. List one "coverages" entry per coverage line item found, however the document lists them (declarations page schedule, endorsement schedule, etc.) — do not collapse multiple coverages into one entry, and do not invent a coverage that isn't in the document.
3. Use the document's own limit and deductible language verbatim. Do not convert percentages to dollars, do not normalize formatting, do not estimate a number that isn't printed.
4. Do not invent, estimate, or infer any value that isn't printed in the document — if a field isn't present or you can't find it, use null (or an empty array for list fields) instead of guessing.
5. "caveats" and "exclusions" are separate: caveats are conditions/limitations on things that ARE covered (e.g. usage caps, waiting periods); exclusions are things that are NOT covered at all.
6. Do not include personally identifying information beyond names already needed for "namedInsureds" — no Social Security Number, no account/policy holder ID beyond what's necessary, no address.

Example output (for format illustration only — replace every value with what's actually in the attached document):
${EXAMPLE_JSON}`;
}

export function buildInsurancePromptTemplate(policyTypeLabel: string, insurer?: string | null): InsurancePromptTemplate {
  return {
    promptText: buildInsuranceAnalysisPrompt(policyTypeLabel, insurer),
    exampleJson: EXAMPLE_JSON,
  };
}
