import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { displayName } from "@/lib/account-name";
import { verifySessionToken } from "@/lib/line";
import ResultList from "./ResultList";
import EmptyState from "./EmptyState";

export const dynamic = "force-dynamic";

// NOTE on anonymized accounts: lib/anonymize.ts nulls out account.line_user_id when
// PDPA-anonymizing a customer, so an anonymized account can never be found by this
// lookup again — it naturally falls through to the "no submissions yet" empty state
// below rather than needing special-case handling.

export default async function ResultPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const profile = token ? await verifySessionToken(token) : null;

  // proxy.ts already gates /result, so this should be unreachable in practice — but the
  // page needs profile.userId as data regardless (it's the lookup key), so handle a null
  // result the same way middleware would rather than crash or render with no identity.
  if (!profile) redirect("/auth");

  const { data: account } = await supabase
    .from("account")
    .select("id, nickname, full_name, first_name, last_name")
    .eq("line_user_id", profile.userId)
    .maybeSingle();

  if (!account) return <EmptyState />;

  const { data: assessments } = await supabase
    .from("user_assessment")
    .select("id, status, created_at, trip:trip_id(destination, visa_type)")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false });

  if (!assessments || assessments.length === 0) return <EmptyState />;

  // Only one submission ever — nothing to choose, skip straight to its detail view.
  if (assessments.length === 1) redirect(`/result/${assessments[0].id}`);

  return <ResultList name={displayName(account)} assessments={assessments} />;
}
