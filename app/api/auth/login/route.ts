import { NextRequest, NextResponse } from "next/server";
import { buildLineAuthUrl } from "@/lib/line";

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state") ?? crypto.randomUUID();
  const url = buildLineAuthUrl(state);
  return NextResponse.redirect(url);
}
