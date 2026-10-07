// Elroco VIN Decoding Code — Code Rules 34A–34F (docs/vin-decoder-rules.md).
// China-built makes on Australian roads: MG, LDV, GWM / Haval, BYD, Chery / Omoda / Jaecoo.
// Sources: Elroco VIN research 2026-09-29 — Australian Government recall VIN lists
// (vehiclerecalls.gov.au; each list names one model): MG REC-001007, 001190, 001632, 005103, 005652,
// 006468; LDV REC-000833, 000834, 006087, 006141, 006165, 006545, 006563, 006606; BYD REC-005579,
// 006728; Chery REC-005891, 006534, 006636. Plus real Australian listings with the model stated
// (Pickles, Grays, carbids, cars24, dealer pages), 17vin.com and whichcar spec-page VIN templates (GWM).
//
// None of these makers publishes what each single character in positions 4–8 means. Positions 4–8
// are therefore decoded only as a whole group, and only where the group is tied to a model by a
// recall list or a listing. Every Australian VIN seen for these makes carries a valid ISO check digit
// and a real ISO model-year letter in position 10. Plant letters (position 11) are not decoded.

import { seg, type MakeRule, type VinSummary } from "../engine";
import { resolveModelYear } from "../modelYear";

interface Group {
  model: string | null;
  series?: string;
  body?: string;
  drive?: string;
  fuel?: string;
  engine?: string;
  /** "single" = one source only (Code Rule 2(f)); shown with a note. */
  single?: boolean;
  note?: string;
}

/** Longest-prefix lookup over keys that start with the WMI (e.g. "LSJW74"). */
function lookup(table: Record<string, Group>, vin: string): Group | null {
  let best: [string, Group] | null = null;
  for (const [k, v] of Object.entries(table)) if (vin.startsWith(k) && (!best || k.length > best[0].length)) best = [k, v];
  return best ? best[1] : null;
}

function describe(g: Group): string {
  const parts = [g.model ?? g.series, g.model && g.series ? g.series : null, g.body, g.drive, g.engine ?? g.fuel].filter(Boolean);
  return parts.join(", ");
}

function chinaRule(opts: {
  id: string; make: string; wmis: string[]; years: [number, number];
  table: Record<string, Group>; groupTo: number; makeOf?: (vin: string) => string;
}): MakeRule {
  return {
    id: opts.id, make: opts.make, wmis: opts.wmis,
    checkDigit: "yes", modelYear: "yes", years: opts.years,
    decode(vin) {
      const make = opts.makeOf?.(vin) ?? opts.make;
      const s: Partial<VinSummary> = { make };
      const g = lookup(opts.table, vin);
      if (g) {
        s.model = g.model; s.series = g.series ?? null; s.body = g.body ?? null;
        s.drive = g.drive ?? null; s.fuel = g.fuel ?? null; s.engine = g.engine ?? null;
      }
      const y = resolveModelYear(vin[9], opts.years[0], opts.years[1]);
      s.modelYear = y;
      const notes = [
        g?.single ? "Single-sourced." : null,
        g?.note ?? null,
        `${make} does not publish what each character means, so these positions are decoded as one group.`,
      ].filter(Boolean).join(" ");
      return {
        segments: [
          seg(4, opts.groupTo, vin, "Model / body / engine group", g ? describe(g) : null, {
            note: g ? notes : "This code group has not been seen on a recall list or listing with the model stated — not decoded.",
          }),
          ...(opts.groupTo < 8 ? [seg(opts.groupTo + 1, 8, vin, "Descriptor (engine / restraint)", null, { note: "Not published by the manufacturer — not decoded." })] : []),
          seg(10, 10, vin, "Model year", y ? String(y) : null, {
            status: "standard",
            note: "A model year, not a build date. Late-year builds often carry the next year's letter.",
          }),
          seg(11, 11, vin, "Assembly plant", null, { note: `${make} plant letters are not published — not decoded.` }),
        ],
        summary: s,
      };
    },
  };
}

// ── MG (SAIC Motor, WMI LSJ) — Code Rule 34B. Group = positions 4–6. ─────────────
const MG: Record<string, Group> = {
  LSJW74: { model: "ZS", series: "ZS / ZST / ZS EV", body: "SUV" },
  LSJWH4: { model: "MG4", body: "Hatch", fuel: "Electric", single: true },
  LSJWP4: { model: "MG3", series: "3rd generation (2024–)", body: "Hatch" },
  LSJZ14: { model: "MG3", series: "2nd generation", body: "Hatch" },
  LSJA24: { model: "HS", series: "HS / HS PHEV / HS +EV", body: "SUV" },
  LSJW24: { model: "MG6", note: "Recall lists cover MG6, MG6 GT and MG6 Plus without saying which code is which." },
  LSJW26: { model: "MG6", note: "Recall lists cover MG6, MG6 GT and MG6 Plus without saying which code is which." },
};
export const mg = chinaRule({ id: "mg", make: "MG", wmis: ["LSJ"], years: [2008, 2030], table: MG, groupTo: 6 });

// ── LDV (SAIC Maxus, WMIs LSF, LSH, LSK) — Code Rule 34C. Group = positions 4–8. ──
const LDV: Record<string, Group> = {
  LSFAM11C: { model: "T60", body: "Ute", single: true, note: "Seen only on T60 and T60 Max listings echoed by search results." },
  LSFA431J: { model: "D90", body: "SUV" },
  LSFAL11: { model: "Deliver 9", note: "On Deliver 9 recall lists; which Deliver 9 body this family is has not been published." },
  LSFAL120: { model: "Deliver 9", series: "Deliver 9 or eDeliver 9", note: "Only on the combined Deliver 9 / eDeliver 9 recall list." },
  LSH14J7C: { model: "Deliver 9", body: "Van" },
  LSKG5G: { model: "Deliver 9", series: "Deliver 9 Bus", body: "Bus" },
  LSKG4GL1: { model: "G10", body: "Van / people mover" },
  LSKG4AL1: { model: null, series: "Shared code: G10 or MIFA", note: "Appears on both the G10 and the MIFA recall lists." },
  LSKG48L1: { model: "MIFA", body: "People mover" },
};
export const ldv = chinaRule({ id: "ldv", make: "LDV", wmis: ["LSF", "LSH", "LSK"], years: [2012, 2030], table: LDV, groupTo: 8 });

// ── GWM / Great Wall / Haval / Tank (WMI LGW) — Code Rule 34D. Group = positions 4–8. ──
const GWM_UTE = (model: string, drive: string, engine: string, body: string, single = false, note?: string): Group =>
  ({ model, drive, engine, body, single, note });
const GWM: Record<string, Group> = {
  LGWCA217: GWM_UTE("SA220", "4x2", "2.2 petrol", "Dual cab ute", true),
  LGWCB317: GWM_UTE("V240", "4x2", "2.4 petrol", "Dual cab ute", false, "One spec-page template labels this code 4x4; real Australian listings are 4x2."),
  LGWCB337: GWM_UTE("V240", "4x2", "2.4 petrol", "Cab chassis", false, "One spec-page template labels this code 4x4; real Australian listings are 4x2."),
  LGWDB317: GWM_UTE("V240", "4x4", "2.4 petrol", "Dual cab ute", true),
  LGWCBE17: GWM_UTE("V200", "4x2", "2.0 turbo diesel", "Dual cab ute", true, "The listing does not state the drive; 4x2 is not confirmed."),
  LGWDBE17: GWM_UTE("V200", "4x4", "2.0 turbo diesel", "Dual cab ute"),
  LGWCB318: GWM_UTE("Steed", "4x2", "2.4 petrol", "Dual cab ute", false, "One auction listing calls a car with this code 4WD; two other sources say 4x2."),
  LGWCBE37: GWM_UTE("Steed", "4x2", "2.0 turbo diesel", "Cab chassis", true),
  LGWDBE18: { model: "Steed", engine: "2.0 turbo diesel", body: "Dual cab ute", single: true, note: "Drive not stated on the listings." },
  LGWCBF19: GWM_UTE("Cannon", "4x2", "2.0 turbo diesel", "Dual cab ute", true),
  LGWDCF19: GWM_UTE("Cannon", "4x4", "2.0 turbo diesel", "Dual cab ute"),
  LGWFF3A5: { model: "X240", drive: "4x4", engine: "2.4 petrol", body: "Wagon" },
  LGWFFEA5: { model: "X200", drive: "4x4", engine: "2.0 turbo diesel", body: "Wagon" },
  LGWEE4A4: { model: "Haval H2", drive: "2WD", engine: "1.5 turbo petrol", body: "SUV" },
  LGWEE4A5: { model: "Haval Jolion", drive: "2WD", engine: "1.5 turbo petrol", body: "SUV" },
  LGWEE5A5: { model: "Haval Jolion", drive: "2WD", body: "SUV", single: true, note: "Seen on 2024-on Jolions." },
  LGWEEUA5: { model: "Haval Jolion", series: "Jolion Hybrid", drive: "2WD", fuel: "Hybrid", body: "SUV", single: true, note: "The same code appears on overseas Ora Good Cat EVs; no Australian Ora VIN has been seen." },
  LGWEF6A5: { model: "Haval H6", drive: "2WD", engine: "2.0 turbo petrol", body: "SUV", note: "Includes the H6 GT." },
  LGWEFUA5: { model: "Haval H6", series: "H6 Hybrid", drive: "2WD", fuel: "Hybrid", body: "SUV", single: true },
  LGWFF6A5: { model: "Haval H6", drive: "AWD", engine: "2.0 turbo petrol", body: "SUV", single: true },
  LGWFF8A6: { model: "Haval H9", drive: "4x4", engine: "2.0 turbo petrol", body: "SUV", single: true },
  LGWFGSA6: { model: "Tank 500", series: "Tank 500 Hybrid", drive: "4x4", fuel: "Hybrid", body: "SUV", single: true },
};
// Make is always "GWM" (Great Wall Motor); the Haval and Tank brands are carried in the model name.
export const gwm = chinaRule({ id: "gwm", make: "GWM", wmis: ["LGW"], years: [2006, 2030], table: GWM, groupTo: 8 });

// ── BYD (WMIs LGX, LC0, LPE) — Code Rule 34E. Group = positions 4–8; the WMI is part of the key
// because the same group (e.g. CE4CB) means Atto 3 under LGX and Dolphin under LC0. ──
const BYD: Record<string, Group> = {
  LGXCE4CB: { model: "Atto 3", body: "SUV", fuel: "Electric" },
  LC0CE4C: { model: "Dolphin", body: "Hatch", fuel: "Electric", single: true },
  LC0C74C4: { model: "Sealion 5", body: "SUV", fuel: "Plug-in hybrid", drive: "FWD", single: true },
  LGXC74C4: { model: "Sealion 6", body: "SUV", fuel: "Plug-in hybrid", drive: "FWD", single: true },
  LGXCD4C4: { model: null, series: "Shared code: Sealion 6 AWD or Sealion 8 AWD", drive: "AWD", single: true, note: "Seen on both models." },
  LGXCH4CD: { model: "Sealion 7", body: "SUV", fuel: "Electric", single: true },
  LGXCH6C: { model: "Seal", body: "Sedan", fuel: "Electric", single: true },
  LPE19W2A: { model: "Shark 6", body: "Dual cab ute", fuel: "Plug-in hybrid" },
  LPE59W2A: { model: "Shark 6", body: "Dual cab ute", fuel: "Plug-in hybrid" },
};
export const byd = chinaRule({ id: "byd", make: "BYD", wmis: ["LGX", "LC0", "LPE"], years: [2010, 2030], table: BYD, groupTo: 8 });

// ── Chery / Omoda / Jaecoo (WMIs LVV, LVT, LNN, LVU) — Code Rule 34F. Group = positions 4–8.
// LVV DB21B is shared by four models, so it is shown as a candidate list, never one model. ──
const CHERY: Record<string, Group> = {
  LVVDB21B: { model: null, series: "Shared code: Omoda 5, Tiggo 4 / 4 Pro, Tiggo 7 or Jaecoo J7 (FWD)", note: "One code across four models on recall lists and listings." },
  LVVDD21B: { model: "Jaecoo J7", single: true, note: "Recall REC-006534 names the model 'Jaecoo T35' (1.6T DCT FWD and AWD); its unit count matches the published J7 recall." },
  LVTD: { model: "Tiggo 8 Pro", series: "Tiggo 8 Pro / Pro Max", body: "SUV" },
  LNNBBDEE: { model: "Tiggo 8", series: "Tiggo 8 Super Hybrid", fuel: "Hybrid", single: true },
  LNNBBDEG: { model: "Tiggo 4", series: "Tiggo 4 Hybrid", fuel: "Hybrid", single: true },
  LNNABDBF: { model: "Omoda E5", fuel: "Electric", single: true },
  LVUGTBAD: { model: "Jaecoo J5", fuel: "Electric", single: true },
};
export const chery = chinaRule({
  id: "chery", make: "Chery", wmis: ["LVV", "LVT", "LNN", "LVU"], years: [2008, 2030], table: CHERY, groupTo: 8,
  makeOf: (vin) => {
    const m = lookup(CHERY, vin)?.model ?? "";
    return m.startsWith("Jaecoo") ? "Jaecoo" : m.startsWith("Omoda") ? "Omoda" : "Chery";
  },
});
