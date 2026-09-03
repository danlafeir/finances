const CHECK_PATTERN = /^CHECK\s+\d+$/i;
const TOKEN_PATTERN = /[A-Za-z0-9][A-Za-z0-9-]*/g;
const MIN_STRIPPED_TOKEN_LENGTH = 7;
// Some descriptions (external-transfer memos) embed the transaction's own date
// as "MM/DD", which is too short to be caught by the length-based token strip
// above but still varies on every occurrence — strip it explicitly.
const DATE_FRAGMENT_PATTERN = /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g;

// Bank/ACH descriptions often embed a per-transaction reference or confirmation
// code (a Zelle memo, a WEB ID contribution number, a session token) alongside
// the stable merchant/payee text, so exact-string matching never groups two
// instances of the same recurring charge. This strips tokens that look like
// reference codes (contain a digit, length >= 7 — shorter than any merchant
// code observed in practice, e.g. "ILD529") so recurring detection and vendor
// labels can key off the stable remainder instead. Check numbers are excluded
// outright, since each one is a genuinely distinct payment, not a repeat.
export function normalizeDescriptionKey(description: string): string {
  const trimmed = description.trim();
  if (CHECK_PATTERN.test(trimmed)) return trimmed;

  const withoutDates = trimmed.replace(DATE_FRAGMENT_PATTERN, "");
  const stripped = withoutDates.replace(TOKEN_PATTERN, (token) =>
    /\d/.test(token) && token.length >= MIN_STRIPPED_TOKEN_LENGTH ? "" : token
  );

  return stripped.replace(/\s+/g, " ").trim();
}
