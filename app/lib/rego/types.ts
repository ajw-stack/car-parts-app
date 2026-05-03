import type { DecodedVehicle } from "../vin/types";

export type RegoLookupSource =
  | "community_cache"
  | "broker_api"
  | "manual";

export interface RegoLookupResult {
  ok: boolean;
  vehicle?: DecodedVehicle;
  needsManualVin?: boolean;
  source?: RegoLookupSource;
  error?: string;
  warning?: string;
}
