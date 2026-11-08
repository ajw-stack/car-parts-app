import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getBillingStatus, reasonMessage } from "../../../lib/billing/entitlement";

export const dynamic = "force-dynamic";

/** GET /api/billing/status -> BillingStatus + message. Works signed out too (returns not_signed_in). */
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  const status = await getBillingStatus(user);
  return NextResponse.json({ ...status, message: status.entitled ? "" : reasonMessage(status) });
}
