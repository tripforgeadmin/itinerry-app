import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const { id, status } = await request.json();
  const { error } = await supabase
    .from("visa_assessments")
    .update({ status })
    .eq("id", id);

  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
