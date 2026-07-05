import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const lineUserId = request.nextUrl.searchParams.get("lineUserId");
  if (!lineUserId) return NextResponse.json({ lang: "th" });

  const { data } = await supabase
    .from("account")
    .select("nationality")
    .eq("line_user_id", lineUserId)
    .single();

  return NextResponse.json({ lang: data?.nationality === "other" ? "en" : "th" });
}
