import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import {
  countSegment,
  type BroadcastSegment,
  type BroadcastCondition,
  type BroadcastConditionItem,
} from "@/lib/broadcast-segment";
import { runBroadcast, type BroadcastRuleRow } from "@/lib/broadcast-send";
import { adsCalendarEnabled, fetchAdKeywords, fetchCalendarEvents, AD_KEYWORDS_CONFIG_KEY } from "@/lib/ads-calendar";

const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Rules pick their own free-form send times; the cron ticks every 5 minutes and fires a
// rule at the first tick at-or-after its time, so any minute is schedulable.
const SLOT_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const VALID_MODES = ["auto", "group", "one_to_one"];

/** Allow-list the jsonb blobs so a typo'd filter never silently matches everyone. */
function cleanSegment(v: unknown): BroadcastSegment | null {
  if (!v || typeof v !== "object") return null;
  const s = v as Record<string, unknown>;
  const arr = (x: unknown, max = 50) =>
    Array.isArray(x) ? x.filter((i) => typeof i === "string").map((i) => (i as string).slice(0, 60)).slice(0, max) : undefined;
  const out: BroadcastSegment = {
    countries: arr(s.countries),
    visaTypes: arr(s.visaTypes),
    ageRanges: arr(s.ageRanges),
    statuses: arr(s.statuses),
    serviceNeeds: arr(s.serviceNeeds),
    journeyStages: arr(s.journeyStages),
  };
  return Object.values(out).some((a) => a?.length) ? out : null;
}

function cleanConditionItem(v: unknown): BroadcastConditionItem | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Record<string, unknown>;
  if (c.type === "no_reply" || c.type === "no_reply_72h") {
    const hours = Number(c.hours);
    return { type: "no_reply", hours: Number.isFinite(hours) && hours >= 1 ? Math.min(Math.round(hours), 720) : 72 };
  }
  if (c.type === "days_left_by_country") return { type: "days_left_by_country" };
  if (c.type === "pain_point" && Array.isArray(c.keys)) {
    const keys = c.keys.filter((k) => typeof k === "string").map((k) => (k as string).slice(0, 120)).slice(0, 20);
    return keys.length ? { type: "pain_point", keys } : null;
  }
  return null;
}

function cleanCondition(v: unknown): BroadcastCondition {
  if (!v || typeof v !== "object") return null;
  const c = v as Record<string, unknown>;
  if (c.type === "all" && Array.isArray(c.items)) {
    // One item per type — duplicates would just AND against themselves.
    const items: BroadcastConditionItem[] = [];
    for (const raw of c.items.slice(0, 10)) {
      const item = cleanConditionItem(raw);
      if (item && !items.some((i) => i.type === item.type)) items.push(item);
    }
    if (items.length === 0) return null;
    return items.length === 1 ? items[0] : { type: "all", items };
  }
  return cleanConditionItem(v);
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  const [campaigns, rules, leadTimes, categories, runs, adEvents, adKeywords] = await Promise.all([
    supabase.from("broadcast_campaign").select("*").order("created_at", { ascending: false }),
    supabase.from("broadcast_rule").select("*").order("created_at", { ascending: false }),
    supabase.from("country_visa_lead_time").select("*").order("destination"),
    supabase.from("comment_category").select("*").eq("kind", "problem").eq("active", true).order("sort_order"),
    supabase.from("broadcast_run").select("*").order("created_at", { ascending: false }).limit(30),
    fetchCalendarEvents(14),
    fetchAdKeywords(),
  ]);
  return NextResponse.json({
    ok: true,
    campaigns: campaigns.data ?? [],
    rules: rules.data ?? [],
    leadTimes: leadTimes.data ?? [],
    painPointOptions: categories.data ?? [],
    runs: runs.data ?? [],
    calendarEnabled: adsCalendarEnabled(),
    adEvents,
    adKeywords,
  });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  if (body.action === "campaign_add") {
    const name = clean(body.name);
    if (!name) return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });
    const { data, error } = await supabase
      .from("broadcast_campaign")
      .insert({
        name,
        start_date: clean(body.startDate, 10) || null,
        end_date: clean(body.endDate, 10) || null,
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data.id });
  }

  if (body.action === "campaign_update") {
    const id = clean(body.id, 64);
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const patch: Record<string, unknown> = {};
    if (typeof body.name === "string") {
      const n = clean(body.name);
      if (!n) return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });
      patch.name = n;
    }
    if (typeof body.startDate === "string") patch.start_date = clean(body.startDate, 10) || null;
    if (typeof body.endDate === "string") patch.end_date = clean(body.endDate, 10) || null;
    if (typeof body.active === "boolean") patch.active = body.active;
    const { error } = await supabase.from("broadcast_campaign").update(patch).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "rule_add" || body.action === "rule_update") {
    const isAdd = body.action === "rule_add";
    const id = clean(body.id, 64);
    if (!isAdd && !id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

    const name = clean(body.name);
    const mode = clean(body.mode, 20);
    if (isAdd && !name) return NextResponse.json({ ok: false, error: "name required" }, { status: 400 });
    if (isAdd && !VALID_MODES.includes(mode)) return NextResponse.json({ ok: false, error: "invalid mode" }, { status: 400 });

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name) patch.name = name;
    if (VALID_MODES.includes(mode)) patch.mode = mode;
    if (body.campaignId !== undefined) patch.campaign_id = clean(body.campaignId, 64) || null;
    if (Array.isArray(body.daysOfWeek)) {
      patch.days_of_week = body.daysOfWeek.filter((d: unknown) => typeof d === "number" && d >= 0 && d <= 6).slice(0, 7);
    }
    if (Array.isArray(body.timeSlots)) {
      patch.time_slots = [...new Set(
        body.timeSlots.filter((s: unknown) => typeof s === "string" && SLOT_RE.test(s)) as string[]
      )].sort().slice(0, 24);
    }
    if (body.perCustomerDays !== undefined) {
      // null = send every run (legacy behaviour); 0 = once ever; N = once per N days.
      const n = Number(body.perCustomerDays);
      patch.per_customer_days =
        body.perCustomerDays === null || body.perCustomerDays === "" || !Number.isFinite(n)
          ? null
          : Math.min(Math.max(Math.round(n), 0), 365);
    }
    if (body.segment !== undefined) patch.segment = cleanSegment(body.segment);
    if (body.condition !== undefined) patch.condition = cleanCondition(body.condition);
    if (typeof body.messageTh === "string") patch.message_th = body.messageTh.trim().slice(0, 2000) || null;
    if (typeof body.messageEn === "string") patch.message_en = body.messageEn.trim().slice(0, 2000) || null;
    if (body.targetAccountId !== undefined) patch.target_account_id = clean(body.targetAccountId, 64) || null;

    if (isAdd) {
      const { data, error } = await supabase.from("broadcast_rule").insert(patch).select("id").single();
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, id: data.id });
    }
    const { error } = await supabase.from("broadcast_rule").update(patch).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "rule_toggle") {
    const id = clean(body.id, 64);
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const { error } = await supabase
      .from("broadcast_rule")
      .update({ enabled: body.enabled === true, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "rule_delete") {
    const id = clean(body.id, 64);
    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    const { error } = await supabase.from("broadcast_rule").delete().eq("id", id); // runs cascade
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "lead_time_set") {
    const destination = clean(body.destination, 2).toUpperCase();
    const visaType = clean(body.visaType, 60) || "*";
    const processingDays = Number(body.processingDays);
    const thresholdDays = Number(body.thresholdDays);
    if (!/^[A-Z]{2}$/.test(destination) || !Number.isFinite(processingDays) || !Number.isFinite(thresholdDays)) {
      return NextResponse.json({ ok: false, error: "invalid lead time" }, { status: 400 });
    }
    const { error } = await supabase.from("country_visa_lead_time").upsert({
      destination,
      visa_type: visaType,
      processing_days: Math.round(processingDays),
      trigger_threshold_days: Math.round(thresholdDays),
      active: true,
    });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "lead_time_delete") {
    const destination = clean(body.destination, 2).toUpperCase();
    const visaType = clean(body.visaType, 60) || "*";
    const { error } = await supabase
      .from("country_visa_lead_time")
      .delete()
      .eq("destination", destination)
      .eq("visa_type", visaType);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "ad_keywords_set") {
    const keywords = clean(body.keywords, 500);
    const { error } = await supabase
      .from("app_config")
      .upsert({ key: AD_KEYWORDS_CONFIG_KEY, value: keywords });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "account_search") {
    // ilike special chars stripped so the .or() filter string can't be broken/injected
    const term = clean(body.term, 60).replace(/[,%()\\]/g, "");
    if (!term) return NextResponse.json({ ok: true, accounts: [] });
    const { data } = await supabase
      .from("account")
      .select("id, nickname, full_name, line_display_name, line_user_id, is_friend, broadcast_opt_out")
      .or(`nickname.ilike.%${term}%,full_name.ilike.%${term}%,line_display_name.ilike.%${term}%`)
      .limit(10);
    return NextResponse.json({ ok: true, accounts: data ?? [] });
  }

  if (body.action === "preview") {
    const result = await countSegment(cleanSegment(body.segment), cleanCondition(body.condition));
    return NextResponse.json({ ok: true, ...result });
  }

  if (body.action === "send_now") {
    const ruleId = clean(body.ruleId, 64);
    if (!ruleId) return NextResponse.json({ ok: false, error: "ruleId required" }, { status: 400 });
    const { data: rule } = await supabase
      .from("broadcast_rule")
      .select("*, campaign:campaign_id(name, active, start_date, end_date)")
      .eq("id", ruleId)
      .maybeSingle();
    if (!rule) return NextResponse.json({ ok: false, error: "rule not found" }, { status: 404 });
    if (rule.mode === "auto") {
      return NextResponse.json({ ok: false, error: "auto rules fire on schedule" }, { status: 400 });
    }

    // Same campaign window the cron enforces — a paused or finished campaign must not be
    // blastable by hand either.
    const c = (Array.isArray(rule.campaign) ? rule.campaign[0] : rule.campaign) as
      { name?: string; active?: boolean; start_date?: string | null; end_date?: string | null } | null;
    if (c) {
      const todayIso = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
      const stop =
        c.active === false ? `แคมเปญ "${c.name ?? ""}" ถูกปิดใช้งานอยู่`
        : c.start_date && todayIso < c.start_date ? `แคมเปญ "${c.name ?? ""}" ยังไม่เริ่ม (เริ่ม ${c.start_date})`
        : c.end_date && todayIso > c.end_date ? `แคมเปญ "${c.name ?? ""}" จบไปแล้ว (สิ้นสุด ${c.end_date})`
        : null;
      if (stop) return NextResponse.json({ ok: false, error: stop }, { status: 400 });
    }

    const now = new Date();
    const { data: run, error: runErr } = await supabase
      .from("broadcast_run")
      .insert({
        rule_id: ruleId,
        slot_date: now.toISOString().slice(0, 10),
        slot_time: `manual:${now.toISOString()}`,
      })
      .select("id")
      .single();
    if (runErr) return NextResponse.json({ ok: false, error: runErr.message }, { status: 500 });

    const result = await runBroadcast(rule as BroadcastRuleRow, run.id as string);
    return NextResponse.json({ ok: true, ...result });
  }

  return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
}
