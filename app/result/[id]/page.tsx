import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { verifySessionToken } from "@/lib/line";
import ResultView from "../ResultView";
import EmptyState from "../EmptyState";

export const dynamic = "force-dynamic";

export default async function ResultDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const profile = token ? await verifySessionToken(token) : null;

  if (!profile) redirect("/auth");

  const { data: account } = await supabase
    .from("account")
    .select("id, full_name, first_name, last_name, nationality, nationality_other, phone, phone_country_code, email")
    .eq("line_user_id", profile.userId)
    .maybeSingle();

  if (!account) return <EmptyState />;

  const { data: assessments } = await supabase
    .from("user_assessment")
    .select("*, trip:trip_id(*)")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false });

  if (!assessments || assessments.length === 0) return <EmptyState />;

  // Security: only ever resolve `id` against this account's own assessment list —
  // a foreign/tampered id can never leak another customer's data. Missing/invalid
  // ids fall back to the list page rather than guessing which one to show.
  const active = assessments.find((a) => a.id === id);
  if (!active) redirect("/result");

  return <ResultView account={account} assessment={active} hasMultiple={assessments.length > 1} />;
}
