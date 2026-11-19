// Elroco VIN Decoding Code — more China-built makes on Australian roads (2026-11-20):
// Geely, Zeekr, smart, Leapmotor, Xpeng, Deepal (Changan) and GAC / Aion.
//
// Source key (every decoded code group has at least two of these agreeing; nothing is from memory):
//  [RAV] Australian Government Register of Approved Vehicles, per-VIN record:
//        https://www.rover.infrastructure.gov.au/RAVPublicSearch?vinno=<VIN>
//        (approval number, approval holder, make, maker's model code, max power kW, motive power, CO2 g/km).
//        Queried 2026-11-20 for 3 VINs of every code group below (110 VINs).
//  [AT]  autotrader.com.au listings, model + variant + drive type stated with the VIN
//        (https://www.autotrader.com.au/car/<id>/...; one platform = ONE source). 359 listings, 2026-11-20.
//  [DR]  drive.com.au listings, VIN + "E245 Inspire Extended Range Wagon 5dr ... 160kW" style variant strings
//        (https://www.drive.com.au/cars-for-sale/car/<id>/; one platform = ONE source).
//  [REC] Australian Government recall VIN list REC-006233 (smart #1 and #3, rear seat-belt buckle):
//        https://www.vehiclerecalls.gov.au/sites/default/files/recall-files/REC-006233-VIN-List-1.csv (112 VINs).
//  [PR]  Australian motoring press / maker pages, used ONLY to confirm drive type and kW (and smart's HX11/HC11 names):
//        smart: paultan.org/bm/panduan-kereta/smart/smart-1/hx11/pro-2024/ (#1 = HX11), paultan.org/research/smart/-3/hc11/pro-2024/
//          (#3 = HC11), club.autodoc.co.uk/manuals/smart/1 ("#1 SUV (HX11)"); drive.com.au/cars-for-sale/search/all/all/smart/3/
//          (variant list "HC11 BRABUS Wagon 5dr Auto 1sp AWD 315kW", "HC11 Premium ... AC200kW"); chasingcars.com.au/news/future-cars/
//          smart-1-and-3-2024-australian-pricing-and-specifications/ (Pro+/Premium 200 kW rear motor; BRABUS 315 kW dual-motor AWD).
//        Zeekr X: carexpert.com.au/car-news/2026-zeekr-x-update-nears-australia-with-more-power (outgoing 200 kW RWD / 315 kW AWD,
//          +50 kW to 250 / 365 kW AWD). Zeekr 7X: carexpert.com.au/zeekr/7x/powertrain-and-performance (2027: 335 kW RWD / 500 kW 4x4)
//          + zecar.com/reviews/2027-zeekr-7x-update-australia-more-power-same-price (+25 kW) = 310 / 475 kW before.
//        Geely: chasingcars.com.au/reviews/midsize-suvs/geely-ex5-2025-review/ + goauto.com.au/amp/95207/2025-geely-ex5-review.html
//          (EX5 160 kW FWD); chasingcars.com.au/reviews/small-cars/geely-ex2-inspire-2026-review/ (EX2 RWD 60 / 85 kW);
//          evcentral.com.au/geely-starray-em-i-adds-awd-power-... (Starray EM-i FWD 193 kW, AWD 220 kW system).
//        Deepal: deepal.com.au/about-us/news-and-articles/e07-vs-s07/ (S07 160 kW RWD; E07 252 kW RWD / 440 kW AWD).
//        Leapmotor: carexpert.com.au/car-news/2026-leapmotor-b10-becomes-australias-cheapest-electric-suv + thebeep.com.au/cars/
//          leapmotor/b10 (B10 160 kW RWD); carsguide.com.au/car-news/budget-friendly-new-ev-lands-in-oz-99729 (C10 160 kW RWD).
//        GAC: racv.com.au/royalauto/transport/electric-vehicles/gac-aion-v-m8-phev-emzoom-price-specs-release-date.html,
//          chasingcars.com.au/reviews/midsize-suvs/gac-aion-v-luxury-2026-review/ (Aion V 150 kW FWD; Emzoom 125 kW FWD; M8 FWD).
//
// Drive type and kW are shown only where [PR] gives the same pairing as the listing [AT] and the approval record [RAV].
// Where RAV and [PR] disagree (Starray EM-i AWD: RAV 313 kW, press 220 kW) the power is not decoded.
//
// None of these makers publishes what each single character of positions 4–8 means, so positions 4–8 are
// decoded only as a group, and only where the group is tied to one model by two sources. Every Australian VIN
// seen for these makes (502 VINs) carries a valid ISO check digit and a real ISO model-year letter in
// position 10. Plant letters (position 11) are not published and are not decoded.
//
// Code groups and their evidence (RAV approval / maker model code / kW, then listing model):
//  Geely  L6T E21SB  EX5 — RAV VTA-064481 "E245" 160 kW EV, FWD [AT, 103 VINs]; [DR] "EX5 E245 ... 160kW".
//         LB3 EH20F  EX2 — RAV VTA-066283 "E22H" EV (60 kW Complete / 85 kW Inspire: NOT in the VIN), RWD [AT, 44].
//         LB3 P11SD  Starray EM-i FWD — RAV VTA-065413 "P145" PHEV 193 kW [AT "Starray Em-I", FWD, 28].
//         LB3 P11SP  Starray EM-i AWD — RAV VTA-065413 "P145" PHEV 313 kW [AT "Starray Em-I Inspire Awd", 8].
//  Zeekr  L6T BX201  X RWD — RAV VTA-064018 "BXE" 200 kW [AT "Zeekr X (Rwd)", 3].
//         L6T BX203  X AWD — RAV VTA-064018 "BXE" 315 kW [AT "Zeekr X (Awd)", 1].
//         L6T BX2SC  X AWD — RAV VTA-065155 "BXE" EV 365 kW (approval holder Zeekr Intelligent Technology) [AT "Zeekr X (Awd)", 1].
//         L6T ZA1S5  7X RWD — RAV VTA-065421 "G00" EV 310 kW [AT "Zeekr 7X Long Range Rwd", 2].
//         L6T ZA1S4  7X AWD — RAV VTA-065421 "G00" EV 475 kW [AT "Zeekr 7X Performance Awd", 3].
//         L6T EF604  009 — RAV VTA-064361 "EF2" 450 kW, 6 seats [AT "Zeekr 009 Awd (6 Seat)", 1].
//         Geely and Zeekr share WMI L6T, so the rule only claims an L6T VIN whose group is in its own table.
//  smart  HES X....  #1 — RAV VTA-063884 "HX11"; HES C.... #3 — RAV VTA-063797 "HC11" (REC-006233 VINs);
//         listings: see SMART table. Positions 6–7 R1 = 200 kW, A2 = 315 kW on both models [RAV, 112 recall VINs].
//  Leapmotor LFZ 63AN5 C10 EV — RAV VTA-064263 "B11" 160 kW, CO2 0 [AT "C10 Style", 1].
//         LFZ 93AN9 C10 REEV — RAV VTA-064263 "B11" 158 kW, CO2 21 g/km (has a combustion engine) [AT "C10 Design Reev", 3].
//         LFZ A5AE2 B10 — RAV VTA-065599 "A12" 160 kW [AT "Leapmotor B10 Style", RWD, 1].
//  Xpeng  L1N NSGHA  G6 — RAV VTA-064130 "G6" (185–358 kW: power/drive NOT in positions 4–8) [AT, 58].
//         L1N NSGHC  X9 — RAV VTA-066164 "H93" EV (255 / 395 kW, FWD and AWD share the code) [AT "Xpeng X9", 13].
//  Deepal LS6 C3E0M  S07 RWD — RAV VTA-064127 "C673" EV 160 kW [AT "Deepal S07 Rwd", 4].
//         LS6 C3E1E  E07 RWD — RAV VTA-065176 "SC6501" EV 252 kW [AT "Deepal E07 R RWD", 1].
//         LS6 C3G0Y  E07 4WD — RAV VTA-065176 "SC6501" EV 440 kW [AT "Deepal E07 Performance 4WD", 2].
//  GAC    LMG HT1L.  Emzoom — RAV VTA-065570 "A79-G" ICE petrol 125 kW [AT "Gac Emzoom", FWD, 42].
//         LMG MB1S.  M8 PHEV — RAV VTA-065550 "A88 (PHEV)" (140 / 189 kW: not in the VIN) [AT "Gac M8", FWD, 9].
//         HAC AALB3  Aion V and Aion UT share positions 4–8. On all 62 VINs seen, position 11 = 1 on Aion V
//         (RAV VTA-065478 "AY5-EU", 26 VINs) and 3 on Aion UT (RAV VTA-065886 "AY2", 36 VINs), both 150 kW EV FWD.
//         Position 11 is most likely a plant letter; the model is decoded from the observed combination only.
//
// Fitment facts these VINs do NOT carry (the app must ask the customer):
//  all makes — trim / grade (Complete vs Inspire, Style vs Design, GL vs Luxury etc.), battery size, colour.
//  all makes — body style is not decoded (only one source per group states it).
//  Geely EX2 — motor power (60 kW vs 85 kW). Xpeng G6 — battery (Standard / Long Range) and RWD vs AWD.
//  Xpeng X9 — FWD vs AWD. GAC M8 — 140 kW vs 189 kW system output. GAC Aion V / UT — battery.
//  Starray EM-i — power level. Zeekr 009, Leapmotor C10 REEV, GAC Aion UT — drive type (one source only).
//  Not yet seen on any Australian VIN (no rule): Geely Coolray, Zeekr 001, smart #5, Xpeng G9, GAC Aion Y.

import { seg, type MakeRule, type VinSummary } from "../engine";
import { resolveModelYear } from "../modelYear";

interface Group {
  model: string | null;
  series?: string;
  body?: string;
  drive?: string;
  fuel?: string;
  /** Power-unit description incl. RAV max power where every VIN of the group agrees. */
  engine?: string;
  note?: string;
}

/** Longest-prefix lookup. Keys are WMI + positions 4–n; a key may use "." as a wildcard for one position. */
function lookup(table: Record<string, Group>, vin: string): Group | null {
  let best: [string, Group] | null = null;
  for (const [k, v] of Object.entries(table)) {
    let ok = true;
    for (let i = 0; i < k.length; i++) if (k[i] !== "." && k[i] !== vin[i]) { ok = false; break; }
    if (ok && (!best || k.replace(/\./g, "").length > best[0].replace(/\./g, "").length)) best = [k, v];
  }
  return best ? best[1] : null;
}

function describe(g: Group): string {
  return [g.model ?? g.series, g.model && g.series ? g.series : null, g.body, g.drive, g.engine ?? g.fuel].filter(Boolean).join(", ");
}

function rule(opts: {
  id: string; make: string; wmis: string[]; years: [number, number]; table: Record<string, Group>;
  /** Only claim VINs whose group is in the table (for a WMI shared with another make). */
  sharedWmi?: string[];
  /** Highest VIN position covered by the code group (defaults to 8). */
  groupTo?: number;
  /** Where the group also uses position 11, its label. */
  pos11Label?: string;
}): MakeRule {
  const groupTo = opts.groupTo ?? 8;
  return {
    id: opts.id, make: opts.make, wmis: opts.wmis,
    match: opts.sharedWmi ? (vin) => !opts.sharedWmi!.includes(vin.slice(0, 3)) || lookup(opts.table, vin) !== null : undefined,
    checkDigit: "yes", modelYear: "yes", years: opts.years,
    decode(vin) {
      const s: Partial<VinSummary> = { make: opts.make };
      // ISO 3780 now allocates first character H to China (Wikibooks WMI table "H = China"; RAV approval holders for
      // HES and HAC are smart Automobile Co., Ltd. and GAC International Co., Ltd.). regions.ts still files H under
      // Africa, so the summary is corrected here.
      if (vin[0] === "H") { s.region = "Asia"; s.country = "China"; }
      const g = lookup(opts.table, vin);
      if (g) {
        s.model = g.model; s.series = g.series ?? null; s.body = g.body ?? null;
        s.drive = g.drive ?? null; s.fuel = g.fuel ?? null; s.engine = g.engine ?? null;
      }
      const y = resolveModelYear(vin[9], opts.years[0], opts.years[1]);
      s.modelYear = y;
      const segs = [
        seg(4, groupTo, vin, "Model / body / powertrain group", g ? describe(g) : null, {
          note: g
            ? [g.note, `${opts.make} does not publish what each character means, so these positions are decoded as one group (Australian approval record + listings).`].filter(Boolean).join(" ")
            : "This code group has not been seen on an Australian approval record and listing with the model stated — not decoded.",
        }),
        ...(groupTo < 8 ? [seg(groupTo + 1, 8, vin, "Descriptor", null, { note: "Not published by the manufacturer — not decoded." })] : []),
        seg(10, 10, vin, "Model year", y ? String(y) : null, {
          status: "standard",
          note: "A model year, not a build date. Late-year builds often carry the next year's letter.",
        }),
        seg(11, 11, vin, opts.pos11Label ?? "Assembly plant", null, {
          note: opts.pos11Label
            ? "Used above to tell the models apart; the maker does not publish what this letter means (most likely the plant)."
            : `${opts.make} plant letters are not published — not decoded.`,
        }),
      ];
      return { segments: segs, summary: s };
    },
  };
}

// ── Geely (WMIs LB3, L6T — Zhejiang Geely Automobile) ──────────────────────────────────────────────
const GEELY: Record<string, Group> = {
  L6TE21SB: { model: "EX5", drive: "FWD", fuel: "Electric", engine: "Electric, 160 kW" },
  LB3EH20F: { model: "EX2", drive: "RWD", fuel: "Electric", note: "Motor power (60 kW Complete, 85 kW Inspire) is not in the VIN." },
  LB3P11SD: { model: "Starray EM-i", drive: "FWD", fuel: "Plug-in hybrid", note: "System power is not decoded: the approval record and the published figures differ for some grades." },
  LB3P11SP: { model: "Starray EM-i", drive: "AWD", fuel: "Plug-in hybrid", note: "The approval record lists 313 kW; Australian reviews give 220 kW system output — power is not decoded." },
};
export const geely = rule({ id: "geely", make: "Geely", wmis: ["LB3", "L6T"], sharedWmi: ["L6T"], years: [2010, 2030], table: GEELY });

// ── Zeekr (WMI L6T, shared with Geely) ───────────────────────────────────────────────────────────────
const ZEEKR: Record<string, Group> = {
  L6TBX201: { model: "X", drive: "RWD", fuel: "Electric", engine: "Electric, 200 kW" },
  L6TBX203: { model: "X", drive: "AWD", fuel: "Electric", engine: "Electric, 315 kW" },
  L6TBX2SC: { model: "X", drive: "AWD", fuel: "Electric", engine: "Electric, 365 kW", note: "Later approval (VTA-065155)." },
  L6TZA1S5: { model: "7X", drive: "RWD", fuel: "Electric", engine: "Electric, 310 kW" },
  L6TZA1S4: { model: "7X", drive: "AWD", fuel: "Electric", engine: "Electric, 475 kW" },
  L6TEF604: { model: "009", fuel: "Electric", note: "Approval record: 450 kW, 6 seats; drive not confirmed by a second source." },
};
export const zeekr = rule({ id: "zeekr", make: "Zeekr", wmis: ["L6T"], sharedWmi: ["L6T"], years: [2021, 2030], table: ZEEKR });

// ── smart (WMI HES — smart Automobile Co., Ltd.) ───────────────────────────────────────────────────
const SMART: Record<string, Group> = {
  HESXR1: { model: "#1", drive: "RWD", fuel: "Electric", engine: "Electric, 200 kW" },
  HESXA2: { model: "#1", series: "BRABUS", drive: "AWD", fuel: "Electric", engine: "Electric, 315 kW" },
  HESCR1: { model: "#3", drive: "RWD", fuel: "Electric", engine: "Electric, 200 kW" },
  HESCA2: { model: "#3", series: "BRABUS", drive: "AWD", fuel: "Electric", engine: "Electric, 315 kW" },
};
export const smart = rule({ id: "smart", make: "smart", wmis: ["HES"], years: [2022, 2030], table: SMART, groupTo: 7 });

// ── Leapmotor (WMI LFZ — Zhejiang Leapmotor; imported by Stellantis Australia) ─────────────────────────
const LEAPMOTOR: Record<string, Group> = {
  LFZ63AN5: { model: "C10", drive: "RWD", fuel: "Electric", engine: "Electric, 160 kW" },
  LFZ93AN9: { model: "C10", series: "C10 REEV", fuel: "Range-extender electric (petrol generator)", note: "Approval record: 158 kW, 21 g/km CO2." },
  LFZA5AE2: { model: "B10", drive: "RWD", fuel: "Electric", engine: "Electric, 160 kW" },
};
export const leapmotor = rule({ id: "leapmotor", make: "Leapmotor", wmis: ["LFZ"], years: [2019, 2030], table: LEAPMOTOR });

// ── Xpeng (WMI L1N — Guangzhou Xiaopeng Motors) ───────────────────────────────────────────────────────
const XPENG: Record<string, Group> = {
  L1NNSGHA: { model: "G6", fuel: "Electric", note: "RWD and AWD, Standard and Long Range all share this code (185–358 kW on the approval records)." },
  L1NNSGHC: { model: "X9", fuel: "Electric", note: "FWD 255 kW and AWD 395 kW share this code." },
};
export const xpeng = rule({ id: "xpeng", make: "Xpeng", wmis: ["L1N"], years: [2018, 2030], table: XPENG });

// ── Deepal (WMI LS6 — Chongqing Changan Automobile) ──────────────────────────────────────────────────
const DEEPAL: Record<string, Group> = {
  LS6C3E0M: { model: "S07", drive: "RWD", fuel: "Electric", engine: "Electric, 160 kW" },
  LS6C3E1E: { model: "E07", drive: "RWD", fuel: "Electric", engine: "Electric, 252 kW" },
  LS6C3G0Y: { model: "E07", drive: "4WD", fuel: "Electric", engine: "Electric, 440 kW" },
};
export const deepal = rule({ id: "deepal", make: "Deepal", wmis: ["LS6"], years: [2020, 2030], table: DEEPAL });

// ── GAC / Aion (WMIs LMG — GAC Motor; HAC — GAC Aion) ───────────────────────────────────────────────
// HAC keys include position 11 ("HACAALB3..1" = positions 1–8, wildcard 9–10, position 11).
const GAC: Record<string, Group> = {
  LMGHT1L: { model: "Emzoom", drive: "FWD", fuel: "Petrol", engine: "Petrol, 125 kW" },
  LMGMB1S: { model: "M8", series: "M8 PHEV", drive: "FWD", fuel: "Plug-in hybrid", note: "140 kW and 189 kW versions share this code." },
  "HACAALB3..1": { model: "Aion V", drive: "FWD", fuel: "Electric", engine: "Electric, 150 kW" },
  "HACAALB3..3": { model: "Aion UT", fuel: "Electric", note: "Approval record: 150 kW; drive not confirmed by a second source." },
};
export const gac = rule({ id: "gac", make: "GAC", wmis: ["LMG", "HAC"], years: [2015, 2030], table: GAC });
