// Elroco VIN Decoding Code — Code Rules 28–30 (docs/vin-decoder-rules.md).
// Subaru, Honda and Land Rover — positions 4–5 carry the manufacturer's own chassis code.
// Sources: Elroco VIN research 2026-09-29 — 24 real Australian VINs from grays.com.au listings
// and user-supplied plates; cars101.com (Subaru platform letters); JLR VIN reference (Elroco folder).

import { seg, type MakeRule, type VinSummary } from "../engine";
import { resolveModelYear } from "../modelYear";

type Chassis = Record<string, [model: string, series: string]>;

function chassisDecode(make: string, table: Chassis, plants: (vin: string) => string | null, pos6to8Label: string) {
  return (vin: string) => {
    const s: Partial<VinSummary> = { make };
    const c = table[vin.slice(3, 5)];
    if (c) { s.model = c[0]; s.series = c[1]; }
    const y = resolveModelYear(vin[9], 1981);
    s.modelYear = y;
    const plant = plants(vin);
    s.plant = plant;
    return {
      segments: [
        seg(4, 5, vin, "Chassis code (model / generation)", c ? `${c[0]} (${c[1]})` : null),
        seg(6, 8, vin, pos6to8Label, null, { note: "Grade and engine block — no published table; not decoded." }),
        seg(10, 10, vin, "Model year", y ? String(y) : null, { note: "Cars built late in a calendar year often carry the next year's code." }),
        seg(11, 11, vin, "Assembly plant", plant),
      ],
      summary: s,
    };
  };
}

// ── Subaru (JF1 cars, JF2 SUVs; all Australian samples built in Gunma, Japan) ──
const SUBARU: Chassis = {
  GC: ["Impreza", "GC (1st gen sedan/coupe)"], GF: ["Impreza", "GF (1st gen wagon)"],
  GD: ["Impreza", "GD (2nd gen sedan)"], GG: ["Impreza", "GG (2nd gen hatch)"],
  GE: ["Impreza", "GE (3rd gen sedan)"], GH: ["Impreza", "GH (3rd gen hatch)"],
  GJ: ["Impreza", "GJ (4th gen sedan)"], GP: ["XV / Impreza", "GP (4th gen hatch / XV)"],
  GK: ["Impreza", "GK (5th gen sedan)"], GT: ["XV / Impreza", "GT (5th gen hatch / XV)"],
  VA: ["WRX", "VA"], VB: ["WRX", "VB"],
  SF: ["Forester", "SF"], SG: ["Forester", "SG"], SH: ["Forester", "SH"], SJ: ["Forester", "SJ"], SK: ["Forester", "SK"],
  BD: ["Liberty", "BD (2nd gen sedan)"], BG: ["Liberty / Outback", "BG (2nd gen wagon)"],
  BE: ["Liberty", "BE (3rd gen sedan)"], BH: ["Liberty / Outback", "BH (3rd gen wagon)"],
  BL: ["Liberty", "BL (4th gen sedan)"], BP: ["Liberty / Outback", "BP (4th gen wagon)"],
  BM: ["Liberty", "BM (5th gen sedan)"], BR: ["Outback", "BR (4th gen)"],
  BN: ["Liberty", "BN (6th gen sedan)"], BS: ["Outback", "BS (5th gen)"], BT: ["Outback", "BT (6th gen)"],
  ZC: ["BRZ", "ZC (1st gen)"], ZD: ["BRZ", "ZD (2nd gen)"],
};

// ── Honda (JHM/JHL Japan, MRH Thailand). Position 9 is a fixed 0, not a check digit. ──
const HONDA: Chassis = {
  RD: ["CR-V", "RD (1st/2nd gen)"], RE: ["CR-V", "RE (3rd gen)"], RM: ["CR-V", "RM (4th gen)"], RW: ["CR-V", "RW (5th gen)"],
  EU: ["Civic", "EU (7th gen)"], ES: ["Civic", "ES (7th gen sedan)"], FD: ["Civic", "FD (8th gen sedan)"],
  FB: ["Civic", "FB (9th gen sedan)"], FC: ["Civic", "FC (10th gen sedan)"], FK: ["Civic", "FK (hatch)"], FL: ["Civic", "FL (11th gen)"],
  GD: ["Jazz", "GD (1st gen)"], GE: ["Jazz", "GE (2nd gen)"], GK: ["Jazz", "GK (3rd gen)"],
  GM: ["City", "GM"], CL: ["Accord Euro", "CL (7th gen)"], CU: ["Accord Euro", "CU (8th gen)"],
  RA: ["Odyssey", "RA"], RB: ["Odyssey", "RB"], RC: ["Odyssey", "RC"],
  GH: ["HR-V", "GH (1st gen)"], RU: ["HR-V", "RU (2nd gen)"],
};
function hondaPlant(vin: string): string | null {
  if (vin.startsWith("MRH")) return vin[10] === "P" || vin[10] === "T" ? "Thailand (Honda Automobile Thailand)" : null;
  if (vin.startsWith("JH")) return vin[10] === "C" || vin[10] === "S" ? "Japan" : null;
  return null;
}

// ── Land Rover (SAL) ──
const LAND_ROVER: Chassis = {
  CA: ["Discovery Sport", "L550"], RA: ["Discovery", "L462"], LA: ["Discovery", "L319 (Discovery 3/4)"],
  WA: ["Range Rover Sport", "L494"], LS: ["Range Rover Sport", "L320"],
  VA: ["Range Rover Evoque", "L538"], GA: ["Range Rover", "L405"], ZA: ["Range Rover Velar", "L560"],
  FA: ["Freelander 2", "L359"], LD: ["Defender", "Classic 90/110"],
};
const LR_PLANT: Record<string, string> = { A: "Solihull, UK", H: "Halewood, UK" };

export const subaru: MakeRule = {
  id: "subaru", make: "Subaru", wmis: ["JF1", "JF2"], checkDigit: "yes", modelYear: "yes",
  decode: chassisDecode("Subaru", SUBARU, (v) => (v[10] === "G" ? "Gunma, Japan" : null), "Body / engine / restraint"),
};
export const honda: MakeRule = {
  id: "honda", make: "Honda", wmis: ["JHM", "JHL", "MRH"], checkDigit: "no", modelYear: "yes",
  decode: chassisDecode("Honda", HONDA, hondaPlant, "Grade / engine"),
};
export const landRover: MakeRule = {
  id: "land-rover", make: "Land Rover", wmis: ["SAL"], checkDigit: "yes", modelYear: "yes",
  decode: chassisDecode("Land Rover", LAND_ROVER, (v) => LR_PLANT[v[10]] ?? null, "Body / engine / restraint"),
};
