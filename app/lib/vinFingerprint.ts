// Positions 1–8 (WMI + VDS) + position 10 (model year char).
// Ignores check digit (pos 9) and serial (pos 11–17).
export function vinFingerprint(vin: string): string {
  const v = vin.toUpperCase();
  return v.substring(0, 8) + v[9];
}
