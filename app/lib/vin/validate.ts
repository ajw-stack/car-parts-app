const TRANSLIT: Record<string, number> = {
  A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,
  J:1,K:2,L:3,M:4,N:5,    P:7,    R:9,
  S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9,
  "0":0,"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,
};
const WEIGHTS = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

export interface VinValidation {
  ok: boolean;
  reason?: "length" | "invalid_chars";
  warning?: string;
}

export function normaliseVin(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export function validateVin(raw: string): VinValidation {
  const vin = normaliseVin(raw);
  if (vin.length !== 17) return { ok: false, reason: "length" };
  if (!VIN_RE.test(vin))  return { ok: false, reason: "invalid_chars" };

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const v = TRANSLIT[vin[i]];
    if (v === undefined) return { ok: false, reason: "invalid_chars" };
    sum += v * WEIGHTS[i];
  }
  const r = sum % 11;
  const expected = r === 10 ? "X" : String(r);
  if (vin[8] !== expected) {
    return { ok: true, warning: "VIN check digit doesn't match — common for some AU/EU vehicles. Decode will still attempt." };
  }
  return { ok: true };
}
