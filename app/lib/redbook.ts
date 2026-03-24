// Server-only — never import in client components
// Uses REDBOOK_API_KEY from .env.local

const BASE = "https://api.redbookdirect.com";

// ─── Token cache ──────────────────────────────────────────────────────────────
let cachedToken: string | null = null;
let cachedRefresh: string | null = null;
let tokenExpiry = 0; // ms since epoch

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry - 60_000) return cachedToken;

  // Try refresh first if we have a refresh token
  if (cachedRefresh && cachedToken) {
    const r = await fetch(`${BASE}/token/refresh`, {
      headers: { "x-accesstoken": cachedToken, "x-refreshtoken": cachedRefresh },
      cache: "no-store",
    });
    if (r.ok) {
      const d = await r.json();
      return applyTokenResponse(d);
    }
  }

  // Fresh token
  const apiKey = process.env.REDBOOK_API_KEY;
  if (!apiKey) throw new Error("REDBOOK_API_KEY is not set");

  const r = await fetch(`${BASE}/token`, {
    headers: { "x-api-key": apiKey },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Redbook auth failed: ${r.status}`);
  const d = await r.json();
  return applyTokenResponse(d);
}

function applyTokenResponse(d: Record<string, string>): string {
  cachedToken = d.accessToken ?? d.access_token ?? d.token ?? Object.values(d)[0];
  cachedRefresh = d.refreshToken ?? d.refresh_token ?? null;
  // Treat token as valid for 50 minutes (typical JWT = 60 min)
  tokenExpiry = Date.now() + 50 * 60 * 1000;
  return cachedToken as string;
}

// ─── Authenticated fetch ──────────────────────────────────────────────────────
async function rbFetch(path: string): Promise<Response> {
  const token = await getToken();
  return fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

// ─── Public helpers ───────────────────────────────────────────────────────────
export type RedbookVehicle = Record<string, unknown>;

export async function findByVin(vin: string): Promise<RedbookVehicle | null> {
  const r = await rbFetch(`/v1/au/car/vehicles/findbyvinplus/${encodeURIComponent(vin)}`);
  if (!r.ok) return null;
  const data = await r.json();
  // API may return an array or a single object
  return Array.isArray(data) ? (data[0] ?? null) : (data ?? null);
}

export async function findByRego(
  state: string,
  rego: string
): Promise<RedbookVehicle | null> {
  const s = state.toLowerCase();
  const r = await rbFetch(
    `/v1/au/car/vehicles/findbyregoplus/${encodeURIComponent(s)}/${encodeURIComponent(rego)}`
  );
  if (!r.ok) return null;
  const data = await r.json();
  return Array.isArray(data) ? (data[0] ?? null) : (data ?? null);
}

export async function getVehicle(rbc: string): Promise<RedbookVehicle | null> {
  const r = await rbFetch(`/v1/au/car/Vehicles/${encodeURIComponent(rbc)}`);
  if (!r.ok) return null;
  return r.json();
}

/** Extract a RedBook Code from a findbyvin/findbyrego response. */
export function extractRbc(vehicle: RedbookVehicle): string | null {
  return (
    (vehicle.redbookCode as string) ??
    (vehicle.rbc as string) ??
    (vehicle.vehicleId as string) ??
    null
  );
}

/** Normalise a Redbook vehicle response into a flat summary. */
export function normaliseVehicle(v: RedbookVehicle) {
  const str = (k: string) => {
    const val = v[k];
    return typeof val === "string" && val.trim() ? val.trim() : null;
  };
  const num = (k: string) => {
    const val = v[k];
    return typeof val === "number" ? val : null;
  };

  return {
    rbc:          extractRbc(v),
    make:         str("make") ?? str("makeName"),
    family:       str("family") ?? str("familyName"),
    year:         num("year") ?? num("yearGroup"),
    badge:        str("badge"),
    series:       str("series"),
    bodyStyle:    str("bodyStyle") ?? str("body"),
    doors:        num("doors"),
    transmission: str("transmission") ?? str("transmissionType"),
    engine:       str("engine") ?? str("engineDescription"),
    engineSize:   str("engineSize") ?? str("engineCapacity"),
    cylinders:    num("cylinders") ?? num("engineCylinders"),
    fuelType:     str("fuelType") ?? str("fuel"),
    driveType:    str("driveType") ?? str("drive"),
    colour:       str("colour") ?? str("color"),
    vin:          str("vin"),
    compliance:   str("compliancePlate") ?? str("compliance"),
    raw:          v,
  };
}
