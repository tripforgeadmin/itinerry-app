import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { verifySessionToken } from "@/lib/line";
import ResultView from "./ResultView";

export const dynamic = "force-dynamic";

// NOTE on anonymized accounts: lib/anonymize.ts nulls out account.line_user_id when
// PDPA-anonymizing a customer, so an anonymized account can never be found by this
// lookup again — it naturally falls through to the "no submissions yet" empty state
// below rather than needing special-case handling.

export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id: requestedId } = await searchParams;

  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const profile = token ? await verifySessionToken(token) : null;

  // proxy.ts already gates /result, so this should be unreachable in practice — but the
  // page needs profile.userId as data regardless (it's the lookup key), so handle a null
  // result the same way middleware would rather than crash or render with no identity.
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

  // Security: never trust `?id=` to fetch someone else's row — only ever resolve it
  // against `assessments`, which is already scoped to this account_id above. Anything
  // that doesn't match (missing, malformed, or someone else's id) silently falls back
  // to the most recent submission instead of erroring.
  const active = assessments.find((a) => a.id === requestedId) ?? assessments[0];

  return <ResultView account={account} assessments={assessments} activeId={active.id} />;
}

function EmptyState() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-surface text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mascot/itin_main.png" alt="" className="w-40 h-40 object-contain opacity-80 mb-4" />
      <h1 className="text-lg font-bold text-primary mb-2">ยังไม่พบข้อมูลการประเมิน</h1>
      <p className="text-sm text-muted leading-relaxed mb-6 max-w-xs">
        ดูเหมือนว่าคุณยังไม่ได้ทำแบบประเมินวีซ่ากับเรา เริ่มทำได้เลยฟรี ใช้เวลาไม่ถึง 2 นาที
      </p>
      <a
        href="/auth"
        className="rounded-2xl px-6 py-3.5 text-white font-bold text-sm shadow-lg"
        style={{ backgroundColor: "#06c755", boxShadow: "0 4px 24px rgba(6,199,85,0.3)" }}
      >
        เริ่มทำแบบประเมิน
      </a>
    </main>
  );
}
