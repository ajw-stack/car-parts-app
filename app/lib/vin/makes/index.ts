// Registry of per-manufacturer VIN rules. The engine picks the first rule whose
// WMI matches positions 1–3 (and whose optional `match` test passes).

import type { MakeRule } from "../engine";
import { holden6G1, holden6H8, holdenZB } from "./holden";
import { audi, volkswagen } from "./volkswagen";
import { mercedes } from "./mercedes";
import { honda, landRover, subaru } from "./japan-uk";
import { isuzu, lexus, privateImport, toyota } from "./toyota";
import { hyundai, kia, mazda, mitsubishi, nissan, nissanUS, suzuki } from "./asia";
import { fcaNorthAmerica, fordAustralia, fordThailand } from "./ford-fca";
import { bmw, holdenKorea, renault } from "./others";
import { byd, chery, gwm, ldv, mg } from "./china";
import { tesla } from "./tesla";

export const MAKE_RULES: MakeRule[] = [
  holden6H8, holden6G1, holdenZB,
  volkswagen, audi,
  mercedes,
  subaru, honda, landRover,
  toyota, lexus, isuzu, privateImport,
  mazda, mitsubishi, nissan, nissanUS, suzuki, hyundai, kia,
  fordAustralia, fordThailand, fcaNorthAmerica,
  holdenKorea, bmw, renault,
  mg, ldv, gwm, byd, chery, tesla,
];

export function findMakeRule(vin: string): MakeRule | null {
  const wmi = vin.slice(0, 3).toUpperCase();
  return MAKE_RULES.find((r) => r.wmis.includes(wmi) && (!r.match || r.match(vin))) ?? null;
}
