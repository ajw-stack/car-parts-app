import { NextRequest, NextResponse } from "next/server";
import { slugToMake } from "../../../lib/makes";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  const make = slugToMake(slug);
  return NextResponse.json({ make: make ?? null });
}
