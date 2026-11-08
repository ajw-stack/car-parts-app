/**
 * Signed "this browser belongs to an admin" cookie, so the coming-soon gate in proxy.ts
 * (which cannot see the Supabase session, held in browser storage) can let admins through.
 * Value: <userId>.<expiryUnixSeconds>.<hex HMAC-SHA256>. Web Crypto only, so it runs in proxy.
 */
export const ADMIN_COOKIE = "elroco_admin";
export const ADMIN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

function secret(): string {
  const s = process.env.ADMIN_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("No secret available for the admin cookie");
  return s;
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signAdminCookie(userId: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_COOKIE_MAX_AGE;
  const body = `${userId}.${exp}`;
  return `${body}.${await hmac(body)}`;
}

export async function verifyAdminCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [userId, exp, sig] = parts;
  if (!userId || !/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
  const expected = await hmac(`${userId}.${exp}`);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
