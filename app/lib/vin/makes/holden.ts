// Elroco VIN Decoding Code — Code Rules 13–15 (docs/vin-decoder-rules.md).
// Holden — WMIs 6H8 (Elizabeth, 1988–Nov 2002), 6G1 (Nov 2002–2017), W0V + Z (ZB Commodore, Rüsselsheim).
// Sources: Holden Commodore VIN guide VB–ZB (Elroco folder, JustCommodores 2020, compiled from vlturbo.com
// and uniquecarsandparts.com.au); Holden Service Techline Feb 2000 (VT Series II start serial);
// GM VIN cards (Elroco folder: plant L = Elizabeth, Australia).
// Entries the guide itself marks as uncertain ("?", "possibly") are left out.

import { seg, type MakeRule, type VinSegment, type VinSummary } from "../engine";
import { resolveModelYear } from "../modelYear";

// ── 6H8 (VN–VX, VQ–WH, 1988–2002) ────────────────────────────────────────────
const SERIES_6H8: Record<string, { series: string; model: string }> = {
  VN: { series: "VN", model: "Commodore" },
  VP: { series: "VP", model: "Commodore" },
  VG: { series: "VG", model: "Utility" },
  VR: { series: "VR", model: "Commodore" },
  VS: { series: "VS", model: "Commodore" },
  VT: { series: "VT", model: "Commodore" },
  VX: { series: "VX", model: "Commodore" },
  VU: { series: "VU", model: "Utility" },
  VQ: { series: "VQ", model: "Statesman / Caprice" },
  WH: { series: "WH", model: "Statesman / Caprice" },
  V2: { series: "V2", model: "Monaro" },
};
const LUXURY_6H8: Record<string, string> = {
  K: "Executive / S / SS (shared code)", L: "Berlina", X: "Calais", S: "SS", Y: "Statesman", Z: "Caprice",
};
// "37" (coupe) is documented for the 1978–88 layout and reused on the V2 Monaro (two real VINs).
const BODY_6H8: Record<string, string> = { "19": "Sedan", "69": "Sedan", "35": "Wagon", "80": "Utility", "37": "Coupe" };
const ENGINE_6H8: Record<string, { name: string; litres: string; cyl: string }> = {
  H: { name: "3.8L V6", litres: "3.8", cyl: "6" },
  A: { name: "3.8L Ecotec V6 (L36)", litres: "3.8", cyl: "6" },
  S: { name: "3.8L supercharged V6 (L67)", litres: "3.8", cyl: "6" },
  // R = supercharged Ecotec, as in the 6G1 table; seen on a 2002 V2 Monaro CV6 (supercharged 3.8).
  R: { name: "3.8L supercharged V6 (L67)", litres: "3.8", cyl: "6" },
  U: { name: "5.0L V8 (5000i)", litres: "5.0", cyl: "8" },
  M: { name: "5.0L V8 (5000i)", litres: "5.0", cyl: "8" },
  F: { name: "5.7L Gen III V8 (LS1)", litres: "5.7", cyl: "8" },
};
const YEAR_6H8: Record<string, number> = {
  J: 1988, K: 1989, L: 1990, M: 1991, N: 1992, P: 1993, R: 1994, S: 1995,
  T: 1996, V: 1997, W: 1998, X: 1999, Y: 2000, "1": 2001, "2": 2002,
};
// Holden Service Techline Feb 2000: VT Series II introduced at serial L464495 (31/05/1999).
const VT_SERIES_II_FIRST_SERIAL = 464495;

function decode6H8(vin: string) {
  const s: Partial<VinSummary> = { make: "Holden" };
  const out: VinSegment[] = [];
  const ser = SERIES_6H8[vin.slice(3, 5)];
  let series = ser?.series ?? null;
  if (series === "VT") {
    const n = parseInt(vin.slice(11), 10);
    if (!Number.isNaN(n)) series = n >= VT_SERIES_II_FIRST_SERIAL ? "VT Series II" : "VT Series I";
  }
  s.series = series; s.model = ser?.model ?? null;
  out.push(seg(4, 5, vin, "Model series", series ? `${series} ${ser!.model}` : null));
  const monaro = vin.slice(3, 5) === "V2";
  const lux = monaro ? (vin[5] === "K" ? "CV6 (K code)" : vin[5] === "X" ? "CV8 (X code)" : null) : LUXURY_6H8[vin[5]] ?? null;
  s.trim = lux;
  out.push(seg(6, 6, vin, "Luxury level", lux, monaro ? { note: "Monaro tier codes K and X follow the engine fitted (supercharged V6 = CV6, V8 = CV8)." } : {}));
  const body = BODY_6H8[vin.slice(6, 8)] ?? null; s.body = body;
  out.push(seg(7, 8, vin, "Body style", body));
  const eng = ENGINE_6H8[vin[8]];
  if (eng) Object.assign(s, { engine: eng.name, engineLitres: eng.litres, engineCylinders: eng.cyl });
  out.push(seg(9, 9, vin, "Engine", eng?.name ?? null, { note: "6H8 VINs use position 9 for the engine, not a check digit." }));
  const yr = YEAR_6H8[vin[9]] ?? null; s.modelYear = yr;
  out.push(seg(10, 10, vin, "Model year", yr ? String(yr) : null));
  const plant = vin[10] === "L" ? "Elizabeth, South Australia" : null; s.plant = plant;
  out.push(seg(11, 11, vin, "Assembly plant", plant));
  return { segments: out, summary: s };
}

// ── 6G1 (VY–VF, WK–WN, Cruze; Nov 2002–2017) ─────────────────────────────────
const MODEL_6G1: Record<string, { series: string; model: string }> = {
  Y: { series: "VY", model: "Commodore" },
  Z: { series: "VZ", model: "Commodore" },
  E: { series: "VE", model: "Commodore" },
  F: { series: "VF", model: "Commodore" },
  K: { series: "WK", model: "Statesman / Caprice" },
  L: { series: "WL", model: "Statesman / Caprice" },
  M: { series: "WM", model: "Statesman / Caprice" },
  N: { series: "WN", model: "Caprice" },
  P: { series: "JG/JH", model: "Cruze" },
};
const LUXURY_6G1: Record<string, string> = {
  K: "Executive / Omega / SV6 / SV8 / SS (shared code)", L: "Berlina", X: "Calais", Z: "Caprice",
  Y: "Statesman", P: "SS V", C: "SS", B: "SV6", J: "Calais V", E: "SS V Redline", A: "International",
};
const CRUZE_TRIM_6G1: Record<string, string> = { D: "Equipe / CD", E: "CDX / SRi / SRi-V / Z-Series (shared code)" };
const BODY_6G1: Record<string, string> = {
  "0": "Cab chassis (One Tonner)", "1": "Coupe", "3": "Crewman (4-door utility)", "4": "Utility", "5": "Sedan", "8": "Wagon",
};
const RESTRAINT_6G1: Record<string, string> = {
  E: "Active belts with load limiters, driver, passenger and side airbags",
  "1": "Active seat belts",
  "2": "Active belts, driver and passenger airbags",
  "3": "Active belts, driver airbag",
  "4": "Active belts, driver, passenger and side airbags",
};
const ENGINE_6G1: Record<string, { name: string; litres: string; cyl: string }> = {
  A: { name: "3.8L Ecotec V6", litres: "3.8", cyl: "6" },
  R: { name: "3.8L supercharged Ecotec V6 (L67)", litres: "3.8", cyl: "6" },
  "7": { name: "3.6L Alloytec 190 V6 (LY7)", litres: "3.6", cyl: "6" },
  "5": { name: "3.0L SIDI V6 (LF1)", litres: "3.0", cyl: "6" },
  "3": { name: "3.6L SIDI V6 (LLT)", litres: "3.6", cyl: "6" },
  V: { name: "3.6L SIDI V6 (LFX)", litres: "3.6", cyl: "6" },
  F: { name: "5.7L Gen III V8 (LS1)", litres: "5.7", cyl: "8" },
  U: { name: "6.0L V8 (LS2)", litres: "6.0", cyl: "8" },
  H: { name: "6.0L V8 (L98)", litres: "6.0", cyl: "8" },
  Y: { name: "6.0L V8 (L77)", litres: "6.0", cyl: "8" },
  W: { name: "6.2L V8 (LS3)", litres: "6.2", cyl: "8" },
};

function decode6G1(vin: string) {
  const s: Partial<VinSummary> = { make: "Holden" };
  const out: VinSegment[] = [];
  const m = MODEL_6G1[vin[3]];
  s.series = m?.series ?? null; s.model = m?.model ?? null;
  out.push(seg(4, 4, vin, "Model", m ? `${m.series} ${m.model}` : null));
  const cruze = vin[3] === "P";
  const lux = cruze ? CRUZE_TRIM_6G1[vin[4]] ?? null : LUXURY_6G1[vin[4]] ?? null;
  s.trim = lux;
  out.push(seg(5, 5, vin, cruze ? "Trim tier" : "Luxury level", lux));
  if (cruze) {
    // Cruze: 6 = body (5 sedan, 6 hatch — hatch production at Elizabeth began late 2011), 7 = restraint.
    const body = vin[5] === "5" ? "Sedan" : vin[5] === "6" ? "Hatch" : null; s.body = body;
    out.push(seg(6, 6, vin, "Body style", body));
    const rs = RESTRAINT_6G1[vin[6]] ?? null; s.restraint = rs;
    out.push(seg(7, 7, vin, "Restraint system", rs));
    out.push(seg(8, 8, vin, "Engine", null, { note: "Cruze engine letters not yet confirmed." }));
  }
  if (!cruze) {
    const body = BODY_6G1[vin[5]] ?? null; s.body = body;
    out.push(seg(6, 6, vin, "Body style", body));
    const rs = RESTRAINT_6G1[vin[6]] ?? null; s.restraint = rs;
    out.push(seg(7, 7, vin, "Restraint system", rs));
    const eng = ENGINE_6G1[vin[7]];
    if (eng) Object.assign(s, { engine: eng.name, engineLitres: eng.litres, engineCylinders: eng.cyl });
    out.push(seg(8, 8, vin, "Engine", eng?.name ?? null));
  }
  const y = resolveModelYear(vin[9], 2002, 2017); s.modelYear = y;
  out.push(seg(10, 10, vin, "Model year", y ? String(y) : null, { note: "Holden model year: cars built Sept–Dec carry the following year's code." }));
  const plant = vin[10] === "L" ? "Elizabeth, South Australia" : null; s.plant = plant;
  out.push(seg(11, 11, vin, "Assembly plant", plant));
  return { segments: out, summary: s };
}

// ── W0V + Z: ZB Commodore (Opel Insignia B, Rüsselsheim, 2018–2020) ──────────
const ZB_TRIM: Record<string, string> = { M: "LT", S: "RS / RS-V", X: "VXR", T: "Calais / Calais-V" };
const ZB_BODY: Record<string, string> = { "6": "5-door liftback", "8": "Sportwagon" };
const ZB_ENGINE: Record<string, { name: string; litres: string; cyl: string }> = {
  C: { name: "2.0L turbo petrol (FWD)", litres: "2.0", cyl: "4" },
  D: { name: "3.6L V6 petrol (AWD)", litres: "3.6", cyl: "6" },
};

function decodeZB(vin: string) {
  const s: Partial<VinSummary> = { make: "Holden", model: "Commodore", series: "ZB" };
  const out: VinSegment[] = [seg(4, 4, vin, "Model", "ZB Commodore")];
  const t = ZB_TRIM[vin[4]] ?? null; s.trim = t;
  out.push(seg(5, 5, vin, "Trim", t));
  const b = ZB_BODY[vin[5]] ?? null; s.body = b;
  out.push(seg(6, 6, vin, "Body style", b));
  const e = ZB_ENGINE[vin[7]];
  if (e) Object.assign(s, { engine: e.name, engineLitres: e.litres, engineCylinders: e.cyl });
  out.push(seg(8, 8, vin, "Engine", e?.name ?? null));
  const y = resolveModelYear(vin[9], 2017, 2020); s.modelYear = y;
  out.push(seg(10, 10, vin, "Model year", y ? String(y) : null));
  return { segments: out, summary: s };
}

export const holden6H8: MakeRule = {
  id: "holden-6h8", make: "Holden", wmis: ["6H8"], checkDigit: "no", modelYear: "yes", years: [1988, 2002],
  decode: decode6H8,
};
export const holden6G1: MakeRule = {
  id: "holden-6g1", make: "Holden", wmis: ["6G1"], checkDigit: "yes", modelYear: "yes", years: [2002, 2017],
  decode: decode6G1,
};
export const holdenZB: MakeRule = {
  id: "holden-zb", make: "Holden", wmis: ["W0V"], match: (v) => v[3] === "Z",
  checkDigit: "yes", modelYear: "yes", years: [2017, 2020],
  decode: decodeZB,
};
