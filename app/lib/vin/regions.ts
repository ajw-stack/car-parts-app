// Country of origin from VIN positions 1–2 (ISO 3779 / SAE J1044 allocations).
// Position 1 gives the region; positions 1–2 together give the country.
// Ranges run through the VIN alphabet A..Z (no I, O, Q) then 1..9, 0.

const SEQ = "ABCDEFGHJKLMNPRSTUVWXYZ1234567890";

function inRange(c2: string, from: string, to: string): boolean {
  const i = SEQ.indexOf(c2);
  return i >= SEQ.indexOf(from) && i <= SEQ.indexOf(to);
}

type Rule = [first: string, from: string, to: string, country: string];

// Only allocations that matter for vehicles on Australian roads are listed in detail;
// anything else still resolves to its region.
const RULES: Rule[] = [
  ["A", "A", "H", "South Africa"],
  ["J", "A", "0", "Japan"],
  ["K", "F", "K", "Israel"],
  ["K", "L", "R", "South Korea"],
  ["L", "A", "0", "China"],
  ["M", "A", "E", "India"],
  ["M", "F", "K", "Indonesia"],
  ["M", "L", "R", "Thailand"],
  ["N", "F", "K", "Pakistan"],
  ["N", "L", "R", "Turkey"],
  ["P", "A", "E", "Philippines"],
  ["P", "F", "K", "Singapore"],
  ["P", "L", "R", "Malaysia"],
  ["R", "F", "K", "Taiwan"],
  ["R", "L", "R", "Vietnam"],
  ["S", "A", "M", "United Kingdom"],
  ["S", "N", "T", "Germany"],
  ["S", "U", "Z", "Poland"],
  ["T", "A", "H", "Switzerland"],
  ["T", "J", "P", "Czech Republic"],
  ["T", "R", "V", "Hungary"],
  ["T", "W", "1", "Portugal"],
  ["U", "H", "M", "Denmark"],
  ["U", "U", "Z", "Romania"],
  ["U", "5", "7", "Slovakia"],
  ["V", "A", "E", "Austria"],
  ["V", "F", "R", "France"],
  ["V", "S", "W", "Spain"],
  ["V", "X", "2", "Serbia"],
  ["W", "A", "0", "Germany"],
  ["X", "L", "R", "Netherlands"],
  ["X", "S", "W", "Russia"],
  ["X", "3", "0", "Russia"],
  ["Y", "A", "E", "Belgium"],
  ["Y", "F", "K", "Finland"],
  ["Y", "S", "W", "Sweden"],
  ["Z", "A", "R", "Italy"],
  ["1", "A", "0", "United States"],
  ["4", "A", "0", "United States"],
  ["5", "A", "0", "United States"],
  ["2", "A", "0", "Canada"],
  ["3", "A", "W", "Mexico"],
  ["6", "A", "W", "Australia"],
  ["7", "A", "E", "New Zealand"],
  ["7", "F", "0", "United States"],
  ["8", "A", "E", "Argentina"],
  ["8", "F", "K", "Chile"],
  ["9", "A", "E", "Brazil"],
  ["9", "F", "J", "Colombia"],
  ["9", "3", "9", "Brazil"],
];

export function regionOf(c1: string): string {
  if ("ABCDEFGH".includes(c1)) return "Africa";
  if ("JKLMNPR".includes(c1)) return "Asia";
  if ("STUVWXYZ".includes(c1)) return "Europe";
  if ("12345".includes(c1)) return "North America";
  if ("67".includes(c1)) return "Oceania";
  if ("890".includes(c1)) return "South America";
  return "";
}

/** Country of origin from positions 1–2. Empty string when the allocation is not listed. */
export function countryOf(vin: string): string {
  const c1 = vin[0]?.toUpperCase() ?? "";
  const c2 = vin[1]?.toUpperCase() ?? "";
  for (const [first, from, to, country] of RULES) {
    if (first === c1 && inRange(c2, from, to)) return country;
  }
  return "";
}
