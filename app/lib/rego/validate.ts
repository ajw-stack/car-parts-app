// Standard-issue plate patterns per state. Personalised/custom plates
// won't match but are treated as a soft warning, not a hard reject.
const STANDARD_PATTERNS: Record<string, RegExp[]> = {
  NSW: [/^[A-Z]{3}[0-9]{2}[A-Z]$/, /^[A-Z]{3}[0-9]{3}$/, /^[0-9]{2}[A-Z]{2}[0-9]{2}$/],
  VIC: [/^[0-9][A-Z]{2}[0-9][A-Z]{2}$/, /^[A-Z]{3}[0-9]{3}$/],
  QLD: [/^[0-9]{3}[A-Z]{2}[0-9]$/, /^[0-9]{3}[A-Z]{3}$/],
  WA:  [/^[0-9][A-Z]{3}[0-9]{3}$/],
  SA:  [/^S[0-9]{3}[A-Z]{3}$/, /^[A-Z]{3}[0-9]{3}$/],
  TAS: [/^[A-Z][0-9]{2}[A-Z]{2}[0-9]$/, /^[A-Z]{3}[0-9]{3}$/],
  ACT: [/^[A-Z]{3}[0-9]{2}[A-Z]$/, /^[A-Z]{3}[0-9]{3}$/],
  NT:  [/^[A-Z]{2}[0-9]{2}[A-Z]{2}$/, /^[0-9]{6}$/, /^[A-Z]{3}[0-9]{2}$/],
};

export const AUS_STATES = [
  { code: "NSW", label: "New South Wales" },
  { code: "VIC", label: "Victoria" },
  { code: "QLD", label: "Queensland" },
  { code: "WA",  label: "Western Australia" },
  { code: "SA",  label: "South Australia" },
  { code: "TAS", label: "Tasmania" },
  { code: "ACT", label: "Australian Capital Territory" },
  { code: "NT",  label: "Northern Territory" },
] as const;

export type AusState = (typeof AUS_STATES)[number]["code"];

export interface RegoValidationResult {
  ok: boolean;
  reason?: "empty" | "too_short" | "too_long" | "invalid_chars";
  warning?: string;
}

export function normaliseRego(input: string): string {
  return input.trim().toUpperCase().replace(/[\s\-]/g, "");
}

export function validateRego(raw: string, state: string): RegoValidationResult {
  const rego = normaliseRego(raw);
  if (!rego)              return { ok: false, reason: "empty" };
  if (rego.length < 2)   return { ok: false, reason: "too_short" };
  if (rego.length > 7)   return { ok: false, reason: "too_long" };
  if (!/^[A-Z0-9]+$/.test(rego)) return { ok: false, reason: "invalid_chars" };

  const patterns = STANDARD_PATTERNS[state];
  if (patterns && !patterns.some((re) => re.test(rego))) {
    return {
      ok: true,
      warning: `"${rego}" doesn't match a standard ${state} plate format. If it's a personalised or custom plate, that's fine.`,
    };
  }
  return { ok: true };
}
