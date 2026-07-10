// Ported chart engine for /admin/dashboard — a faithful port of the mockup's vanilla-JS engine
// (docs/Itinerary · User Analytics Dashboard.html). It fills the skeleton in DashboardView.tsx by
// element id via innerHTML — the same way you'd integrate any non-React chart lib. Browser-only
// (touches document); imported solely by the "use client" DashboardView. `mountDashboard(data)`
// wires it up and returns a cleanup fn.

import { flagEmoji, sortedCountries } from "@/lib/countries";
import type { DashboardData } from "@/lib/dashboard-data";

type Row = [string, number, string?];

// ---- palette + lookup constants (reconciled with the real DB enum values) ----
const C = {
  sky: "#44A8DB", skyd: "#2B86B5", skyl: "#D6EFFA", navy: "#1B3D5C", navys: "#2E5573",
  surf: "#F0F8FD", sun: "#FFD166", mint: "#D4F1E4", mintt: "#1A7A4A", mute: "#6B7B8D",
};
const CAT = [C.sky, C.navy, C.sun, C.skyd, "#4FB98A", "#7FA8C4", "#F0B84E", "#A7D8ED"];
const SRC: Record<string, string> = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", google: "Google", referral: "เพื่อนแนะนำ", other: "อื่นๆ" };
const SRC_ORDER = ["facebook", "instagram", "tiktok", "google", "referral", "other"];
const STL: Record<string, string> = { contacted: "ติดต่อแล้ว", lost: "แพ้ดีล", out_of_scope: "นอกขอบเขต", human_error: "ข้อมูลผิดพลาด", pending_decision: "รอตัดสินใจ", pending_review: "รอตรวจ", win: "ปิดดีล", evaluated: "ประเมินแล้ว" };
const STC: Record<string, string> = { contacted: C.sky, win: C.mintt, lost: C.mute, out_of_scope: "#B7C4CE", human_error: C.navys, pending_decision: C.sun, pending_review: C.skyl, evaluated: "#8B7FD6" };
const OCC: Record<string, string> = { employee: "พนักงานบริษัท", freelance: "ฟรีแลนซ์", homemaker: "แม่บ้าน/พ่อบ้าน", business_owner: "เจ้าของธุรกิจ", government: "ราชการ/รัฐวิสาหกิจ", retired: "เกษียณ", student_occ: "นักเรียน/นักศึกษา" };
const OCC_C = [C.sky, C.skyd, C.navys, C.navy, C.mute, "#7FA8C4", "#A7D8ED"];
const INT: Record<string, string> = { explore: "กำลังสำรวจ", execute: "ตั้งใจไป", ready: "พร้อมยื่นแล้ว" };
const INT_ORDER = ["explore", "execute", "ready"];
const INT_C = [C.skyl, C.sky, C.mintt];
const VT: Record<string, string> = { tourist: "ท่องเที่ยว", visitor: "เยี่ยม/Visitor", business: "ธุรกิจ", student: "นักเรียน", other: "อื่นๆ" };
const VT_ORDER = ["tourist", "visitor", "business", "student", "other"];
const VT_C = [C.sky, C.sun, C.navy, C.mintt, C.mute];
const TIE: Record<string, string> = { dependents: "มีคนในอุปการะ", job: "มีงานประจำ", property: "มีทรัพย์สิน/บ้าน", spouse_children: "คู่สมรส/บุตร", investments: "มีการลงทุน", none: "ไม่มี" };
const TIE_C = [C.mintt, C.sky, C.skyd, C.navys, C.navy, C.mute];
const SKL: Record<string, string> = { pending_review: "รอตรวจ", evaluated: "ประเมินผล", contacted: "ติดต่อ", pending_decision: "รอตัดสินใจ", lost: "แพ้ดีล", win: "ปิดดีล", human_error: "ข้อมูลผิดพลาด", out_of_scope: "นอกขอบเขต" };
const SKC: Record<string, string> = { pending_review: "#8FBFDE", evaluated: "#2B86B5", contacted: "#44A8DB", pending_decision: "#FFD166", lost: "#9DB4C4", win: "#1A7A4A", human_error: "#5E7A91", out_of_scope: "#B7C4CE" };
const SK_COLS = [["pending_review"], ["evaluated"], ["contacted"], ["pending_decision", "lost"], ["win", "human_error", "out_of_scope"]];

// Full ISO→[flag, Thai name] map so any real destination resolves (mockup hardcoded ~17).
const CTRY: Record<string, [string, string]> = {};
for (const c of sortedCountries("th")) CTRY[c.code.toLowerCase()] = [flagEmoji(c.code), c.th];

// ---- pure helpers (verbatim from the mockup) ----
const esc = (s: unknown) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pctOf = (v: number, b: number) => (b ? Math.round((v / b) * 100) : 0);
function countBy<T>(arr: T[], fn: (x: T) => string | null | undefined): Map<string, number> {
  const m = new Map<string, number>();
  arr.forEach((x) => { const k = fn(x); if (k == null) return; m.set(k, (m.get(k) || 0) + 1); });
  return m;
}
function median(a: number[]): number | string {
  if (!a.length) return "–";
  const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function seq(v: number, mx: number): string {
  if (v <= 0) return C.skyl;
  const t = v / mx, a = [214, 239, 250], b = [43, 134, 181];
  const r = a.map((x, i) => Math.round(x + (b[i] - x) * t));
  return "rgb(" + r[0] + "," + r[1] + "," + r[2] + ")";
}
const empty = (msg?: string) => '<div class="empty"><span class="eg">🐘</span>' + (msg || "ไม่มีข้อมูลในช่วงที่เลือก") + "</div>";
const fill = (id: string, html: string) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
function setKpi(id: string, val: string | number, sub: string) {
  const v = document.getElementById(id); if (v) v.innerHTML = String(val);
  const s = document.getElementById(id + "-s"); if (s) s.innerHTML = sub;
}

// ---- chart builders (verbatim; typed) ----
function hbars(rows: Row[], opt?: { base?: number; pal?: string[] }): string {
  opt = opt || {};
  const mx = Math.max(1, ...rows.map((r) => r[1]));
  const base = opt.base || rows.reduce((s, r) => s + r[1], 0) || 1;
  if (!rows.length) return empty();
  return '<div class="hbars">' + rows.map((r, i) => {
    const w = (r[1] / mx) * 100, col = r[2] || (opt!.pal ? opt!.pal[i % opt!.pal.length] : C.sky), p = pctOf(r[1], base);
    return '<div class="hbar"><div class="hbar-lab">' + esc(r[0]) + '</div><div class="hbar-track"><div class="hbar-fill" style="width:' + w.toFixed(1) + "%;background:" + col + '"></div></div><div class="hbar-val"><b>' + r[1] + "</b><em>" + p + "%</em></div></div>";
  }).join("") + "</div>";
}
function donut(rows: [string, number][], opt?: { pal?: string[]; size?: number; thick?: number; top?: string | number; sub?: string }): string {
  opt = opt || {};
  const pal = opt.pal || CAT, size = opt.size || 170, thick = opt.thick || 32;
  const total = rows.reduce((s, r) => s + r[1], 0) || 1;
  const r = (size - thick) / 2, cx = size / 2, cy = size / 2, Circ = 2 * Math.PI * r;
  let off = 0;
  const segs = rows.map((row, i) => {
    const frac = row[1] / total, ln = frac * Circ, c = pal[i % pal.length];
    const s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + c + '" stroke-width="' + thick + '" stroke-dasharray="' + ln.toFixed(2) + " " + (Circ - ln).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 ' + cx + " " + cy + ')"><title>' + esc(row[0]) + ": " + row[1] + " (" + Math.round(frac * 100) + "%)</title></circle>";
    off += ln; return s;
  }).join("");
  const t = opt.top != null ? '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" class="dn-top">' + esc(opt.top) + "</text>" : "";
  const su = opt.sub != null ? '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" class="dn-sub">' + esc(opt.sub) + "</text>" : "";
  return '<svg viewBox="0 0 ' + size + " " + size + '" width="' + size + '" height="' + size + '" class="donut">' + segs + t + su + "</svg>";
}
function legend(rows: [string, number][], pal?: string[]): string {
  pal = pal || CAT;
  const total = rows.reduce((s, r) => s + r[1], 0) || 1;
  return '<ul class="legend">' + rows.map((r, i) => '<li><span class="dot" style="background:' + pal![i % pal!.length] + '"></span><span class="lg-lab">' + esc(r[0]) + '</span><span class="lg-val">' + r[1] + " <em>" + Math.round((r[1] / total) * 100) + "%</em></span></li>").join("") + "</ul>";
}
function vbars(rows: [string, number][], base?: number): string {
  const mx = Math.max(1, ...rows.map((r) => r[1]));
  base = base || rows.reduce((s, r) => s + r[1], 0) || 1;
  return '<div class="vbars">' + rows.map((r) => {
    const h = (r[1] / mx) * 140, p = pctOf(r[1], base!), v = r[1] ? "<b>" + r[1] + "</b><small>" + p + "%</small>" : "";
    return '<div class="vb"><div class="vb-val">' + v + '</div><div class="vb-bar" style="height:' + h.toFixed(0) + "px;background:" + seq(r[1], mx) + '"></div><div class="vb-lab">' + esc(r[0]) + "</div></div>";
  }).join("") + "</div>";
}
function funnel(stages: Row[]): string {
  const base = stages[0][1] || 1, cols = [C.sky, C.skyd, C.navys, C.navy, C.mintt];
  return '<div class="funnel">' + stages.map((s, i) => {
    const w = Math.max((s[1] / base) * 100, 7), p = pctOf(s[1], base);
    return '<div class="fn-row"><div class="fn-lab">' + esc(s[0]) + "<small>" + esc(s[2] || "") + '</small></div><div class="fn-track"><div class="fn-fill" style="width:' + w.toFixed(1) + "%;background:" + (cols[i] || C.sky) + '"><span class="fn-n">' + s[1] + '</span></div><span class="fn-pct">' + p + "%</span></div></div>";
  }).join("") + "</div>";
}
function fillDays(accs: { t: number }[]): [string, number][] {
  if (!accs.length) return [];
  // bucket by Asia/Bangkok calendar day (UTC+7) — the app treats Bangkok as local
  const day = (t: number) => { const d = new Date(t + 7 * 3600000); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
  const cnt = new Map<number, number>();
  accs.forEach((a) => { const k = day(a.t); cnt.set(k, (cnt.get(k) || 0) + 1); });
  const ks = [...cnt.keys()].sort((a, b) => a - b), lo = ks[0], hi = ks[ks.length - 1], out: [string, number][] = [];
  for (let d = lo; d <= hi; d += 86400000) { const dt = new Date(d); out.push([String(dt.getUTCMonth() + 1).padStart(2, "0") + "-" + String(dt.getUTCDate()).padStart(2, "0"), cnt.get(d) || 0]); }
  return out;
}
function lineChart(data: [string, number][]): string {
  if (!data.length) return empty();
  const w = 560, h = 200, padL = 28, padR = 16, padT = 16, padB = 28, n = data.length;
  const mx = Math.max(1, ...data.map((d) => d[1]));
  let s = 0; const cum: number[] = []; data.forEach((d) => { s += d[1]; cum.push(s); });
  const cmax = cum[n - 1] || 1, tot = cmax, iw = w - padL - padR, ih = h - padT - padB;
  const X = (i: number) => padL + (n > 1 ? (iw * i) / (n - 1) : iw / 2), Yc = (v: number) => padT + ih - (v / cmax) * ih * 0.9;
  const bw = Math.min(38, (iw / n) * 0.5);
  const bars = data.map((d, i) => { const bh = (d[1] / mx) * ih * 0.9, x = X(i) - bw / 2, y = padT + ih - bh; return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="3" fill="' + C.skyl + '"><title>' + d[0] + ": " + d[1] + " คน/วัน (" + pctOf(d[1], tot) + "%)</title></rect>"; }).join("");
  const pts = data.map((d, i) => X(i).toFixed(1) + "," + Yc(cum[i]).toFixed(1));
  const dots = data.map((d, i) => '<circle cx="' + X(i).toFixed(1) + '" cy="' + Yc(cum[i]).toFixed(1) + '" r="3.5" fill="' + C.skyd + '"><title>สะสม ' + cum[i] + " (" + pctOf(cum[i], tot) + "%)</title></circle>").join("");
  const step = Math.ceil(n / 8);
  const xl = data.map((d, i) => (i % step === 0 || i === n - 1) ? '<text x="' + X(i).toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle" class="axl">' + d[0] + "</text>" : "").join("");
  const grid = [0, 1, 2, 3].map((g) => { const gy = padT + (ih * g) / 3; return '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (w - padR) + '" y2="' + gy.toFixed(1) + '" stroke="#E7F2F9"/>'; }).join("");
  const area = "M " + X(0).toFixed(1) + "," + (padT + ih) + " " + pts.map((p) => "L " + p).join(" ") + " L " + X(n - 1).toFixed(1) + "," + (padT + ih) + " Z";
  return '<svg viewBox="0 0 ' + w + " " + h + '" width="100%" class="lc">' + grid + '<path d="' + area + '" fill="' + C.sky + '" opacity="0.10"/>' + bars + '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + C.skyd + '" stroke-width="2.5"/>' + dots + xl + "</svg>";
}
function skHeight(cols: string[][]): number { const mx = Math.max(...cols.map((c) => c.length), 1); return Math.max(320, 120 + mx * 70); }
function sankey(trans: { f: string | null; t: string }[]): string {
  const em = new Map<string, number>();
  trans.forEach((x) => { const k = x.f + ">" + x.t; em.set(k, (em.get(k) || 0) + 1); });
  const edges = [...em.entries()].map(([k, n]) => { const p = k.split(">"); return { f: p[0], t: p[1], n, sy: 0, ty: 0 }; });
  if (!edges.length) return empty("ไม่มีการเปลี่ยนสถานะในช่วงนี้");
  const present = new Set<string>(); edges.forEach((e) => { present.add(e.f); present.add(e.t); });
  const nodes: Record<string, { in: number; out: number }> = {}; present.forEach((s) => (nodes[s] = { in: 0, out: 0 }));
  edges.forEach((e) => { nodes[e.f].out += e.n; nodes[e.t].in += e.n; });
  const cols = SK_COLS.map((c) => c.filter((s) => present.has(s))).filter((c) => c.length);
  const meta: Record<string, { col: number; row: number; val: number; x: number; y: number; h: number }> = {};
  cols.forEach((c, ci) => c.forEach((s, ri) => { meta[s] = { col: ci, row: ri, val: Math.max(nodes[s].in, nodes[s].out), x: 0, y: 0, h: 0 }; }));
  const ord = (s: string) => meta[s].col * 100 + meta[s].row;
  const W = 760, H = skHeight(cols), nodeW = 13, padL = 66, padR = 150, padTop = 20, padBot = 14, gapV = 20, numCols = cols.length;
  const availH = H - padTop - padBot;
  const colSum = cols.map((c) => c.reduce((s, x) => s + meta[x].val, 0));
  const maxColSum = Math.max(...colSum, 1), maxNodes = Math.max(...cols.map((c) => c.length), 1);
  const scale = (availH - (maxNodes - 1) * gapV) / maxColSum;
  const colX = (ci: number) => padL + ci * ((W - padL - padR - nodeW) / Math.max(numCols - 1, 1));
  cols.forEach((c, ci) => { const stackH = c.reduce((s, x) => s + meta[x].val * scale, 0) + (c.length - 1) * gapV; let y = padTop + (availH - stackH) / 2; c.forEach((s) => { meta[s].x = colX(ci); meta[s].h = meta[s].val * scale; meta[s].y = y; y += meta[s].h + gapV; }); });
  const soff: Record<string, number> = {}, toff: Record<string, number> = {}; present.forEach((s) => { soff[s] = meta[s].y; toff[s] = meta[s].y; });
  const bySrc: Record<string, typeof edges> = {}; edges.forEach((e) => { (bySrc[e.f] = bySrc[e.f] || []).push(e); });
  Object.values(bySrc).forEach((l) => { l.sort((a, b) => ord(a.t) - ord(b.t)); l.forEach((e) => { e.sy = soff[e.f]; soff[e.f] += e.n * scale; }); });
  const byTgt: Record<string, typeof edges> = {}; edges.forEach((e) => { (byTgt[e.t] = byTgt[e.t] || []).push(e); });
  Object.values(byTgt).forEach((l) => { l.sort((a, b) => ord(a.f) - ord(b.f)); l.forEach((e) => { e.ty = toff[e.t]; toff[e.t] += e.n * scale; }); });
  const totalOut = nodes["pending_review"] ? nodes["pending_review"].out : edges.reduce((s, e) => s + e.n, 0);
  const ribs = edges.map((e) => {
    const x0 = meta[e.f].x + nodeW, x1 = meta[e.t].x, xm = (x0 + x1) / 2, h = e.n * scale, sy = e.sy, ty = e.ty, col = SKC[e.f] || C.sky;
    const d = "M " + x0.toFixed(1) + "," + sy.toFixed(1) + " C " + xm.toFixed(1) + "," + sy.toFixed(1) + " " + xm.toFixed(1) + "," + ty.toFixed(1) + " " + x1.toFixed(1) + "," + ty.toFixed(1) + " L " + x1.toFixed(1) + "," + (ty + h).toFixed(1) + " C " + xm.toFixed(1) + "," + (ty + h).toFixed(1) + " " + xm.toFixed(1) + "," + (sy + h).toFixed(1) + " " + x0.toFixed(1) + "," + (sy + h).toFixed(1) + " Z";
    return '<path d="' + d + '" fill="' + col + '" fill-opacity="0.34"><title>' + SKL[e.f] + " → " + SKL[e.t] + ": " + e.n + " เคส (" + pctOf(e.n, totalOut) + "% ของ leads)</title></path>";
  }).join("");
  const nds = Object.keys(meta).map((s) => {
    const m = meta[s], col = SKC[s] || C.sky, val = Math.max(nodes[s].in, nodes[s].out), cy = m.y + m.h / 2;
    const rect = '<rect x="' + m.x.toFixed(1) + '" y="' + m.y.toFixed(1) + '" width="' + nodeW + '" height="' + Math.max(m.h, 2).toFixed(1) + '" rx="3" fill="' + col + '"><title>' + SKL[s] + ": " + val + " เคส</title></rect>";
    let lab: string;
    if (m.col === 0) { const lx = m.x - 8; lab = '<text x="' + lx + '" y="' + (cy - 1).toFixed(1) + '" text-anchor="end" class="sk-lab">' + SKL[s] + '</text><text x="' + lx + '" y="' + (cy + 11).toFixed(1) + '" text-anchor="end" class="sk-val">' + val + ' <tspan class="sk-pct">' + pctOf(val, totalOut) + "%</tspan></text>"; }
    else if (m.col === numCols - 1) { const lx = m.x + nodeW + 8; lab = '<text x="' + lx + '" y="' + (cy - 1).toFixed(1) + '" text-anchor="start" class="sk-lab">' + SKL[s] + '</text><text x="' + lx + '" y="' + (cy + 11).toFixed(1) + '" text-anchor="start" class="sk-val">' + val + ' <tspan class="sk-pct">' + pctOf(val, totalOut) + "%</tspan></text>"; }
    else { const lx = m.x + nodeW / 2; lab = '<text x="' + lx.toFixed(1) + '" y="' + (m.y - 6).toFixed(1) + '" text-anchor="middle" class="sk-lab">' + SKL[s] + ' <tspan class="sk-val">' + val + " (" + pctOf(val, totalOut) + "%)</tspan></text>"; }
    return rect + lab;
  }).join("");
  return '<svg viewBox="0 0 ' + W + " " + H + '" width="100%" class="sk" style="min-height:' + H + 'px">' + ribs + nds + "</svg>";
}

// ---- mount: wire the engine to the DOM + live data; returns cleanup ----
const DAY = 86400000;
const PRESETS: Record<string, [number, string]> = { all: [0, "ทั้งหมด"], "60": [60 * DAY, "60 วัน"], "30": [30 * DAY, "30 วัน"], "15": [15 * DAY, "15 วัน"], "7": [7 * DAY, "7 วัน"], "3": [3 * DAY, "3 วัน"], "24h": [DAY, "24 ชั่วโมง"] };

export function mountDashboard(data: DashboardData): () => void {
  const NOW = data.now;
  const LOST = data.lostLabels;
  const ACC = data.acc.map((a) => ({ ...a, t: Date.parse(a.c) }));
  const ASS = data.ass.map((a) => ({ ...a, t: Date.parse(a.c) }));
  const TRANS = data.trans.map((x) => ({ ...x, tm: Date.parse(x.ac) }));
  const USERS_ALL = ACC.length, ASS_ALL = ASS.length;

  function apply(from: number, to: number, label: string) {
    const acc = ACC.filter((a) => a.t >= from && a.t <= to);
    const ass = ASS.filter((a) => a.t >= from && a.t <= to);
    const ro = document.getElementById("readout");
    if (ro) ro.innerHTML = "แสดง <b>" + acc.length + "</b> ผู้ใช้ · <b>" + ass.length + "</b> เคส · ช่วง <b>" + esc(label) + "</b>";

    const friends = acc.filter((a) => a.f).length;
    const scores = ass.filter((a) => a.score != null).map((a) => a.score as number);
    const avg = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : null;
    const med = median(scores);
    const passDec = ass.filter((a) => a.pass != null), passT = passDec.filter((a) => a.pass === true).length;
    const won = ass.filter((a) => a.st === "win").length;
    const contacted = ass.filter((a) => ["contacted", "pending_decision", "win", "lost"].includes(a.st)).length;
    const tcs = ass.filter((a) => a.tc != null).map((a) => a.tc as number); const avgtc = tcs.length ? tcs.reduce((s, x) => s + x, 0) / tcs.length : null;
    setKpi("k-users", acc.length, "= " + pctOf(acc.length, USERS_ALL) + "% ของทั้งหมด " + USERS_ALL);
    setKpi("k-friends", friends, pctOf(friends, acc.length) + "% ของผู้ใช้ช่วงนี้");
    setKpi("k-assess", ass.length, "= " + pctOf(ass.length, ASS_ALL) + "% ของทั้งหมด " + ASS_ALL);
    setKpi("k-score", avg != null ? avg.toFixed(1) : "–", avg != null ? "มัธยฐาน " + med + " · " + scores.length + " เคส" : "ไม่มีคะแนน");
    setKpi("k-pass", passDec.length ? pctOf(passT, passDec.length) + "%" : "–", passDec.length ? passT + " ผ่าน / " + (passDec.length - passT) + " ไม่ผ่าน" : "ยังไม่ตัดสิน");
    setKpi("k-won", won, "อัตราปิด " + pctOf(won, contacted) + "% · ติดต่อ " + contacted + (avgtc != null ? " · " + avgtc.toFixed(1) + " ชม." : ""));

    const evald = passDec.length, rsent = ass.filter((a) => a.rs).length;
    fill("c-funnel", ass.length ? funnel([["ส่งแบบประเมิน", ass.length, "leads เข้าระบบ"], ["ประเมินผลแล้ว", evald, "ทีมให้คะแนน"], ["ส่งผลกลับลูกค้า", rsent, "ส่งผ่าน LINE"], ["เข้าเจรจา/ติดต่อ", contacted, "เข้า pipeline ขาย"], ["ปิดดีลสำเร็จ", won, "เป็นลูกค้า"]]) : empty());
    const iF = document.getElementById("i-funnel"); if (iF) iF.innerHTML = ass.length ? "จากแบบประเมิน <b>" + ass.length + "</b> ปิดได้ <b>" + won + "</b> (อัตราปิด " + pctOf(won, ass.length) + "%) · ประเมินแล้ว " + pctOf(evald, ass.length) + "%" : "—";

    const stMap = countBy(ass, (a) => a.st); const stRows: Row[] = [...stMap.entries()].map(([k, v]) => [STL[k] || k, v, STC[k] || C.sky] as Row).sort((a, b) => b[1] - a[1]);
    fill("c-status", ass.length ? hbars(stRows, { base: ass.length }) : empty());
    const lostMap = countBy(ass.filter((a) => a.l1), (a) => a.l1); const lostTxt = [...lostMap.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => esc(LOST[k] || k) + " " + v).join(" · ") || "ยังไม่มีเคสแพ้";
    const iL = document.getElementById("i-lost"); if (iL) iL.innerHTML = "<b>เหตุผลที่แพ้ดีล:</b> " + lostTxt;

    const tf = TRANS.filter((x) => x.tm >= from && x.tm <= to);
    fill("c-sankey", sankey(tf));
    const reachedC = tf.filter((x) => x.t === "contacted").length, wonC = tf.filter((x) => x.t === "win").length, lostC = tf.filter((x) => x.t === "lost").length;
    const cS = document.getElementById("cap-sankey"); if (cS) cS.innerHTML = "การไหลของเคสระหว่างสถานะ · นับจาก " + tf.length + " ครั้งการเปลี่ยนสถานะ (status_history) · % = สัดส่วนของ leads";
    const iS = document.getElementById("i-sankey"); if (iS) iS.innerHTML = tf.length ? 'จากเคสในช่วงนี้ <b>' + pctOf(reachedC, ass.length) + '%</b> ไปถึงขั้น "ติดต่อ" · ปิดดีล <b>' + wonC + "</b> · แพ้ <b>" + lostC + "</b> · ที่เหลือยังค้างในแต่ละสถานะ" : "—";

    const srcRows: [string, number][] = SRC_ORDER.map((k) => [SRC[k], acc.filter((a) => a.src === k).length] as [string, number]).filter((r) => r[1] > 0);
    fill("c-source", acc.length ? donut(srcRows, { top: acc.length, sub: "ผู้ใช้" }) + legend(srcRows) : empty());
    const fbig = acc.filter((a) => a.src === "facebook" || a.src === "instagram").length;
    const iSo = document.getElementById("i-source"); if (iSo) iSo.innerHTML = acc.length ? "<b>Facebook + Instagram = " + pctOf(fbig, acc.length) + "%</b> ของผู้ใช้ช่วงนี้ — ช่องทางหลัก" : "—";

    const days = fillDays(acc);
    fill("c-line", lineChart(days));
    const peak = days.reduce((m, d) => (d[1] > m[1] ? d : m), ["", 0] as [string, number]);
    const mPeak = document.getElementById("m-peak"); if (mPeak) mPeak.innerHTML = String(peak[1]);
    const mPeakL = document.getElementById("m-peak-l"); if (mPeakL) mPeakL.innerHTML = "วันพีค " + (peak[0] || "–") + " (" + pctOf(peak[1], acc.length) + "%)";
    const mAvg = document.getElementById("m-avg"); if (mAvg) mAvg.innerHTML = acc.length && days.length ? (acc.length / days.length).toFixed(1) : "0";
    const mFriend = document.getElementById("m-friend"); if (mFriend) mFriend.innerHTML = pctOf(friends, acc.length) + "%";

    const destMap = countBy(ass, (a) => a.dest); const destRows: Row[] = [...destMap.entries()].map(([k, v]) => [CTRY[k] ? CTRY[k][0] + " " + CTRY[k][1] : k, v] as Row).sort((a, b) => b[1] - a[1]);
    const dpal = destRows.map((r, i) => (i < 3 ? C.sky : i < 5 ? C.skyd : C.navys));
    fill("c-dest", destRows.length ? hbars(destRows.map((r, i) => [r[0], r[1], dpal[i]] as Row), { base: ass.length }) : empty());
    const cD = document.getElementById("cap-dest"); if (cD) cD.innerHTML = destRows.length + " ประเทศ จาก " + ass.length + " ทริป";

    const vtRows: [string, number][] = VT_ORDER.map((k) => [VT[k], ass.filter((a) => a.vt === k).length] as [string, number]).filter((r) => r[1] > 0);
    fill("c-visa", ass.length ? donut(vtRows, { pal: VT_C, top: ass.length, sub: "ทริป" }) + legend(vtRows, VT_C) : empty());
    const tv = ass.filter((a) => a.vt === "tourist" || a.vt === "visitor").length;
    const iV = document.getElementById("i-visa"); if (iV) iV.innerHTML = ass.length ? "<b>ท่องเที่ยว + Visitor = " + pctOf(tv, ass.length) + "%</b> ของดีมานด์ช่วงนี้" : "—";

    const occRows: Row[] = Object.keys(OCC).map((k) => [OCC[k], ass.filter((a) => a.occ === k).length] as Row).filter((r) => r[1] > 0).sort((a, b) => b[1] - a[1]);
    fill("c-occ", occRows.length ? hbars(occRows, { pal: OCC_C, base: ass.length }) : empty());

    const intRows: Row[] = INT_ORDER.map((k, i) => [INT[k], ass.filter((a) => a.int === k).length, INT_C[i]] as Row).filter((r) => r[1] > 0);
    fill("c-intent", intRows.length ? hbars(intRows, { base: ass.length }) : empty());
    const hot = ass.filter((a) => a.int === "execute" || a.int === "ready").length;
    const iI = document.getElementById("i-intent"); if (iI) iI.innerHTML = ass.length ? '<b>"ตั้งใจไป" + "พร้อมยื่น" = ' + hot + " เคส</b> (" + pctOf(hot, ass.length) + "%) คือกลุ่มร้อนที่ควรรีบติดตาม" : "—";

    const cLine = ass.filter((a) => a.cp === "line").length, cCall = ass.filter((a) => a.cp === "call").length;
    const cpRows: [string, number][] = ([["LINE", cLine], ["โทรกลับ", cCall]] as [string, number][]).filter((r) => r[1] > 0);
    fill("c-contact", ass.length ? donut(cpRows, { pal: [C.sky, C.sun], size: 150, top: pctOf(cLine, ass.length) + "%", sub: "เลือก LINE" }) + legend(cpRows, [C.sky, C.sun]) : empty());

    const buckets = [[20, 30], [30, 40], [40, 50], [50, 60], [60, 70], [70, 80], [80, 90], [90, 100]];
    const hrows: [string, number][] = buckets.map((b) => [b[0] + "–" + b[1], scores.filter((s) => s >= b[0] && s < (b[1] === 100 ? 101 : b[1])).length] as [string, number]);
    fill("c-hist", scores.length ? vbars(hrows, scores.length) : empty());
    const cH = document.getElementById("cap-hist"); if (cH) cH.innerHTML = scores.length ? scores.length + " เคสที่ให้คะแนน · % = สัดส่วนของ " + scores.length + " · เฉลี่ย " + (avg as number).toFixed(1) + " · มัธยฐาน " + med : "ไม่มีคะแนนในช่วงนี้";
    const topB = hrows.reduce((m, r) => (r[1] > m[1] ? r : m), ["", 0] as [string, number]);
    const iH = document.getElementById("i-hist"); if (iH) iH.innerHTML = scores.length ? "คะแนนกระจุกที่ช่วง <b>" + topB[0] + " (" + topB[1] + " เคส, " + pctOf(topB[1], scores.length) + "%)</b> — เหมาะกับบริการช่วยจัดเอกสารให้แน่นขึ้น" : "—";

    const tieMap = new Map<string, number>(); ass.forEach((a) => (a.ties || []).forEach((k) => tieMap.set(k, (tieMap.get(k) || 0) + 1)));
    const tieRows: Row[] = [...tieMap.entries()].map(([k, v]) => [TIE[k] || k, v] as Row).sort((a, b) => b[1] - a[1]);
    fill("c-ties", tieRows.length ? hbars(tieRows.map((r, i) => [r[0], r[1], TIE_C[i % TIE_C.length]] as Row), { base: ass.length }) : empty());
    const cT = document.getElementById("cap-ties"); if (cT) cT.innerHTML = "เลือกได้หลายข้อ · % = สัดส่วนของ " + ass.length + " เคสที่ระบุข้อนั้น";
  }

  function setPreset(key: string) {
    document.querySelectorAll(".chip").forEach((c) => (c as HTMLElement).classList.toggle("on", (c as HTMLElement).dataset.k === key));
    const cf = document.getElementById("cf-from") as HTMLInputElement | null; if (cf) cf.value = "";
    const ct = document.getElementById("cf-to") as HTMLInputElement | null; if (ct) ct.value = "";
    if (key === "all") apply(-Infinity, Infinity, "ทั้งหมด");
    else apply(NOW - PRESETS[key][0], NOW, "ย้อนหลัง " + PRESETS[key][1]);
  }

  // ---- wire listeners (tracked for cleanup) ----
  const chipHandlers: Array<[Element, () => void]> = [];
  document.querySelectorAll(".chip").forEach((c) => {
    const h = () => setPreset((c as HTMLElement).dataset.k || "all");
    c.addEventListener("click", h); chipHandlers.push([c, h]);
  });
  const applyBtn = document.getElementById("cf-apply");
  const applyHandler = () => {
    const f = (document.getElementById("cf-from") as HTMLInputElement).value, t = (document.getElementById("cf-to") as HTMLInputElement).value;
    if (!f && !t) { setPreset("all"); return; }
    const from = f ? Date.parse(f + "T00:00:00Z") : -Infinity, to = t ? Date.parse(t + "T23:59:59Z") : Infinity;
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("on"));
    apply(from, to, (f || "เริ่มต้น") + " → " + (t || "ปัจจุบัน"));
  };
  if (applyBtn) applyBtn.addEventListener("click", applyHandler);

  const links = [...document.querySelectorAll("nav.sub a")] as HTMLAnchorElement[];
  const linkHandlers: Array<[HTMLAnchorElement, (e: Event) => void]> = [];
  links.forEach((a) => {
    const h = (e: Event) => { e.preventDefault(); const href = a.getAttribute("href"); if (href) document.querySelector(href)?.scrollIntoView({ behavior: "smooth" }); };
    a.addEventListener("click", h); linkHandlers.push([a, h]);
  });
  const secs = links.map((a) => document.querySelector(a.getAttribute("href") || "")).filter(Boolean) as Element[];
  const obs = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) { const id = "#" + (e.target as HTMLElement).id; links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === id)); } }); }, { rootMargin: "-55% 0px -42% 0px" });
  secs.forEach((s) => obs.observe(s));

  setPreset("all");

  return () => {
    chipHandlers.forEach(([c, h]) => c.removeEventListener("click", h));
    if (applyBtn) applyBtn.removeEventListener("click", applyHandler);
    linkHandlers.forEach(([a, h]) => a.removeEventListener("click", h));
    obs.disconnect();
  };
}
