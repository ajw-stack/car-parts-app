// Elroco VIN Decoding Code — Parts 1–2 (Rules 1–12), docs/vin-decoder-rules.md.
// Position-by-position VIN decoder.
// Step 1: the WMI (positions 1–3) gives region, country of origin and manufacturer.
// Step 2: the manufacturer's rule file decodes positions 4–17 in order.
// Anything a rule file does not cover falls back to the ISO 3779 meaning of that position,
// and anything with no confirmed meaning is shown as "not decoded" rather than guessed.

import { countryOf, regionOf } from "./regions";
import { resolveModelYear, yearCandidates } from "./modelYear";
import { lookupWMI } from "../wmi";
import { findMakeRule } from "./makes";

export type SegmentStatus = "decoded" | "standard" | "not-decoded" | "filler";

export interface VinSegment {
  from: number;          // 1-based position
  to: number;            // 1-based position, inclusive
  chars: string;
  label: string;         // what this position means
  value: string | null;  // what these characters decode to
  note?: string;
  status: SegmentStatus;
}

export interface VinSummary {
  make: string | null;
  manufacturer: string | null;
  model: string | null;
  series: string | null;
  trim: string | null;
  body: string | null;
  engine: string | null;
  engineLitres: string | null;
  engineCylinders: string | null;
  fuel: string | null;
  transmission: string | null;
  drive: string | null;
  restraint: string | null;
  modelYear: number | null;
  plant: string | null;
  country: string | null;
  region: string | null;
  serial: string | null;
}

export interface MakeDecode {
  segments: VinSegment[];
  summary: Partial<VinSummary>;
}

export interface MakeRule {
  id: string;
  make: string;
  /** Exact 3-character WMIs this rule decodes. */
  wmis: string[];
  /** Extra match test, for WMIs shared by more than one rule. */
  match?: (vin: string) => boolean;
  /** Does this manufacturer put a real check digit in position 9 on AU-delivered cars? */
  checkDigit: "yes" | "no" | "mixed";
  /** Does position 10 carry an ISO model-year code on AU-delivered cars? */
  modelYear: "yes" | "no" | "mixed";
  /** Plausible model-year window for this WMI, used to resolve the 30-year cycle. */
  years?: [number, number];
  decode(vin: string): MakeDecode;
}

export interface VinBreakdown {
  vin: string;
  valid: boolean;
  error?: string;
  wmi: string;
  rule: string | null;
  checkDigit: { char: string; expected: string; matches: boolean };
  segments: VinSegment[];
  summary: VinSummary;
}

// Make names for WMIs that have no rule file yet (outside the top 20 on Australian roads).
const WMI_MAKE: Record<string, string> = {
  LGW: "GWM (Great Wall / Haval)", MA1: "Mahindra", KPT: "SsangYong (KGM)", LYV: "Volvo", YV1: "Volvo", YV4: "Volvo",
  "9BF": "Ford", LSJ: "MG", LVV: "Chery", LGX: "BYD", "5YJ": "Tesla", LRW: "Tesla", XP7: "Tesla",
};

// ─── helpers for rule files ────────────────────────────────────────────────────

export function seg(from: number, to: number, vin: string, label: string, value: string | null, extra: Partial<VinSegment> = {}): VinSegment {
  return {
    from, to, chars: vin.slice(from - 1, to), label, value,
    status: value ? "decoded" : "not-decoded",
    ...extra,
  };
}

export function filler(from: number, to: number, vin: string, note = "Filler character — carries no meaning on vehicles built for Australia."): VinSegment {
  return { from, to, chars: vin.slice(from - 1, to), label: "Filler", value: null, note, status: "filler" };
}

// ─── check digit (ISO 3779 / FMVSS 565 algorithm) ───────────────────────────────

const TRANSLIT: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export function expectedCheckDigit(vin: string): string {
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += (TRANSLIT[vin[i]] ?? 0) * WEIGHTS[i];
  const r = sum % 11;
  return r === 10 ? "X" : String(r);
}

// ─── main entry ────────────────────────────────────────────────────────────────

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

function emptySummary(): VinSummary {
  return {
    make: null, manufacturer: null, model: null, series: null, trim: null, body: null,
    engine: null, engineLitres: null, engineCylinders: null, fuel: null, transmission: null,
    drive: null, restraint: null, modelYear: null, plant: null, country: null, region: null, serial: null,
  };
}

export function decodeVinPositions(raw: string): VinBreakdown {
  const vin = raw.trim().toUpperCase().replace(/\s+/g, "");
  const summary = emptySummary();
  const base: VinBreakdown = {
    vin, valid: false, wmi: vin.slice(0, 3), rule: null,
    checkDigit: { char: vin[8] ?? "", expected: "", matches: false },
    segments: [], summary,
  };
  if (vin.length !== 17) return { ...base, error: "A VIN is 17 characters. Shorter numbers are chassis numbers (pre-1989 in Australia)." };
  if (!VIN_RE.test(vin)) return { ...base, error: "A VIN cannot contain the letters I, O or Q." };

  // ── Step 1: WMI → region, country, manufacturer ─────────────────────────────
  const wmi = vin.slice(0, 3);
  const region = regionOf(vin[0]);
  const country = countryOf(vin);
  const manufacturer = lookupWMI(vin);
  summary.region = region || null;
  summary.country = country || null;
  summary.manufacturer = manufacturer;

  const segments: VinSegment[] = [
    seg(1, 1, vin, "Region of origin", region || null),
    seg(1, 2, vin, "Country of origin", country || null),
    seg(1, 3, vin, "World Manufacturer Identifier (WMI)", manufacturer, manufacturer ? {} : { note: "WMI not in the Elroco table yet." }),
  ];

  // ── Step 2: manufacturer rule for positions 4–17 ───────────────────────────
  const rule = findMakeRule(vin);
  const made = rule ? rule.decode(vin) : { segments: [], summary: {} };
  Object.assign(summary, Object.fromEntries(Object.entries(made.summary).filter(([, v]) => v != null)));
  if (rule && !summary.make) summary.make = rule.make;
  if (!summary.make) summary.make = WMI_MAKE[wmi] ?? null;

  const covered = new Set<number>();
  for (const s of made.segments) for (let p = s.from; p <= s.to; p++) covered.add(p);
  const free = (from: number, to: number) => { for (let p = from; p <= to; p++) if (covered.has(p)) return false; return true; };

  // Generic fallbacks, only where the rule said nothing.
  const generic: VinSegment[] = [];

  if (free(4, 8)) {
    generic.push(seg(4, 8, vin, "Vehicle Descriptor Section (model, body, engine)", null, {
      note: rule ? "Not yet mapped for this manufacturer." : "Manufacturer not yet mapped in Elroco.",
    }));
  }

  const expected = expectedCheckDigit(vin);
  const cdMatches = vin[8] === expected;
  if (free(9, 9)) {
    const uses = rule?.checkDigit ?? "mixed";
    let value: string;
    if (cdMatches) value = "Valid check digit";
    else if (uses === "no") value = "Not used by this manufacturer on Australian-delivered vehicles";
    else value = `Does not match (expected ${expected})`;
    generic.push({
      from: 9, to: 9, chars: vin[8], label: "Check digit", value,
      note: !cdMatches && uses !== "no" ? "A mismatch can mean a typing error. Many Japanese and European exports to Australia do not use a check digit." : undefined,
      status: "standard",
    });
  }

  if (free(10, 10)) {
    const code = vin[9];
    const uses = rule?.modelYear ?? "mixed";
    const cands = yearCandidates(code);
    let value: string | null = null;
    let note: string | undefined;
    if (uses === "no") {
      note = "This manufacturer does not encode the model year in Australian-delivered VINs — the build date is on the compliance or build plate.";
    } else if (cands.length) {
      const [lo, hi] = rule?.years ?? [1981, new Date().getFullYear() + 1];
      const y = resolveModelYear(code, lo, hi);
      if (y) { value = String(y); summary.modelYear = summary.modelYear ?? y; }
      else value = cands.join(" or ");
      if (uses === "mixed") note = "Year code per ISO 3779. Some exports to Australia put a filler here instead.";
    } else {
      note = "Not a model-year code (filler).";
    }
    generic.push({ from: 10, to: 10, chars: code, label: "Model year", value, note, status: value ? "standard" : "filler" });
  }

  if (free(11, 11)) generic.push(seg(11, 11, vin, "Assembly plant", null, { note: "Plant code not yet mapped for this manufacturer." }));

  if (free(12, 17)) {
    summary.serial = summary.serial ?? vin.slice(11);
    generic.push({ from: 12, to: 17, chars: vin.slice(11), label: "Production sequence number", value: vin.slice(11), status: "standard" });
  }

  const all = [...segments, ...made.segments, ...generic].sort((a, b) => a.from - b.from || a.to - b.to);

  return {
    vin, valid: true, wmi, rule: rule?.id ?? null,
    checkDigit: { char: vin[8], expected, matches: cdMatches },
    segments: all, summary,
  };
}
