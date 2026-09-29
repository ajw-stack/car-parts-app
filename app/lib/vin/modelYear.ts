// Position 10 model-year code (ISO 3779 / FMVSS 565 cycle).
// The code repeats every 30 years: A = 1980 or 2010, Y = 2000 or 2030, 1–9 = 2001–2009 or 2031–2039.
// I, O, Q, U, Z and 0 are never year codes.

const CYCLE = "ABCDEFGHJKLMNPRSTVWXY123456789";

/** Every calendar year the code can stand for, oldest first. Empty when the character is not a year code. */
export function yearCandidates(code: string): number[] {
  const i = CYCLE.indexOf(code.toUpperCase());
  if (i < 0) return [];
  return [1980 + i, 2010 + i];
}

/**
 * Resolve the 30-year ambiguity using a plausible window.
 * `earliest`/`latest` come from the make or WMI (e.g. a WMI that only existed 1988–2002).
 * Returns null when the character is not a year code or no candidate fits.
 */
export function resolveModelYear(code: string, earliest = 1980, latest = new Date().getFullYear() + 1): number | null {
  const fits = yearCandidates(code).filter((y) => y >= earliest && y <= latest);
  return fits.length === 1 ? fits[0] : fits.length > 1 ? fits[fits.length - 1] : null;
}
