export type DataSource = "nhtsa" | "redbook" | "manual";

export interface DecodedVehicle {
  vin: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  bodyClass: string | null;
  engineCylinders: string | null;
  engineDisplacementL: string | null;
  fuelType: string | null;
  transmission: string | null;
  driveType: string | null;
  manufacturer: string | null;
  plantCountry: string | null;
  source: DataSource;
  confidence: "high" | "partial" | "low";
  rawErrors: string | null;
}

export interface DecodeResult {
  ok: boolean;
  vehicle?: DecodedVehicle;
  error?: string;
}

export interface GarageVehicle extends DecodedVehicle {
  id: string;
  userId: string;
  nickname?: string | null;
  rego?: string | null;
  regoState?: string | null;
  createdAt: string;
}
