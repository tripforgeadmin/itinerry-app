"use client";

import { useEffect } from "react";
import { ItinerryLogo } from "@/components/ItinerryLogo";
import AdminLangToggle from "../AdminLangToggle";
import { mountDashboard } from "./engine";
import { t, dateLocale, type Lang } from "@/lib/i18n";
import type { DashboardData } from "@/lib/dashboard-data";

// The mockup's CSS, verbatim, with 'Prompt' → 'Plus Jakarta Sans','Noto Sans Thai' (the app's
// loaded faces). Scoped to this dedicated page; the admin app elsewhere uses Tailwind, not these
// class names, so there's no clash.
const CSS = `
.dash *{box-sizing:border-box}
.dash{font-family:'Plus Jakarta Sans','Noto Sans Thai',sans-serif;background:#FDFEFF;color:#2C2C2C;-webkit-font-smoothing:antialiased;line-height:1.5;min-height:100vh}
.dash .num{font-family:'Plus Jakarta Sans','Noto Sans Thai',sans-serif;font-feature-settings:"tnum"}
.dash .wrap{max-width:1120px;margin:0 auto;padding:0 20px 64px}
.dash header{position:sticky;top:0;z-index:30;background:rgba(253,254,255,.94);backdrop-filter:blur(10px);border-bottom:1px solid #D6EFFA}
.dash .hd{max-width:1120px;margin:0 auto;padding:12px 20px 8px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.dash .hd h1{font-size:16px;font-weight:700;color:#1B3D5C;letter-spacing:-.2px}
.dash .hd .pill{margin-left:auto;font-size:11.5px;color:#2E5573;background:#D6EFFA;padding:5px 11px;border-radius:999px;font-weight:600}
.dash .filters{max-width:1120px;margin:0 auto;padding:8px 20px;display:flex;gap:7px;align-items:center;flex-wrap:wrap;border-top:1px solid #EAF4FB}
.dash .f-lbl{font-size:11px;color:#6B7B8D;font-weight:600;margin-right:2px}
.dash .chip{font-size:12.5px;font-weight:600;color:#2E5573;background:#fff;border:1px solid #D6EFFA;padding:6px 13px;border-radius:999px;cursor:pointer;transition:.15s;font-family:inherit}
.dash .chip:hover{background:#F0F8FD}
.dash .chip.on{background:#44A8DB;color:#fff;border-color:#44A8DB}
.dash .cf{display:flex;gap:6px;align-items:center;margin-left:auto;flex-wrap:wrap}
.dash .cf input{font-family:inherit;font-size:12px;border:1px solid #D6EFFA;border-radius:8px;padding:6px 8px;color:#1B3D5C;background:#fff}
.dash .cf button{font-family:inherit;font-size:12px;font-weight:700;color:#fff;background:#1B3D5C;border:none;border-radius:8px;padding:7px 12px;cursor:pointer}
.dash .cf button:hover{background:#2E5573}
.dash .cf span{font-size:11px;color:#6B7B8D}
.dash .readout{max-width:1120px;margin:0 auto;padding:2px 20px 10px;font-size:12.5px;color:#2E5573}
.dash .readout b{color:#1B3D5C;font-family:'Plus Jakarta Sans','Noto Sans Thai'}
.dash nav.sub{display:flex;gap:6px;padding:6px 20px 0;max-width:1120px;margin:0 auto;flex-wrap:wrap}
.dash nav.sub a{font-size:13px;font-weight:600;color:#2E5573;text-decoration:none;padding:7px 14px;border-radius:999px;transition:.15s;cursor:pointer}
.dash nav.sub a:hover{background:#D6EFFA;color:#1B3D5C}
.dash nav.sub a.on{background:#44A8DB;color:#fff}
.dash .hero{padding:18px 0 4px}
.dash .hero .sub{color:#6B7B8D;font-size:14px;margin-top:4px}
.dash .kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;margin:16px 0 8px}
.dash .kpi{background:#fff;border:1px solid #D6EFFA;border-radius:16px;padding:16px;display:flex;gap:12px;box-shadow:0 1px 3px rgba(27,61,92,.05)}
.dash .kpi-ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:19px;flex-shrink:0}
.dash .kpi-val{font-size:26px;font-weight:800;color:#1B3D5C;line-height:1;font-family:'Plus Jakarta Sans','Noto Sans Thai'}
.dash .kpi-lab{font-size:12.5px;color:#2E5573;font-weight:600;margin-top:4px}
.dash .kpi-sub{font-size:11px;color:#6B7B8D;margin-top:2px;min-height:14px}
.dash section{scroll-margin-top:186px;margin-top:32px}
.dash .sec-h{display:flex;align-items:baseline;gap:10px;margin-bottom:14px}
.dash .sec-h h2{font-size:19px;font-weight:700;color:#1B3D5C}
.dash .sec-h span{font-size:13px;color:#6B7B8D}
.dash .grid{display:grid;gap:16px}
.dash .g2{grid-template-columns:1fr 1fr}
.dash .g3{grid-template-columns:1.3fr 1fr 1fr}
.dash .card{background:#fff;border:1px solid #D6EFFA;border-radius:16px;padding:18px 20px;box-shadow:0 1px 3px rgba(27,61,92,.05)}
.dash .card h3{font-size:14px;font-weight:700;color:#1B3D5C;margin-bottom:2px}
.dash .card .cap{font-size:12px;color:#6B7B8D;margin-bottom:14px}
.dash .insight{display:flex;gap:8px;align-items:flex-start;background:#F0F8FD;border:1px solid #D6EFFA;border-radius:12px;padding:10px 12px;margin-top:14px;font-size:12.5px;color:#2E5573}
.dash .insight b{color:#1B3D5C}
.dash .hbars{display:flex;flex-direction:column;gap:11px}
.dash .hbar{display:grid;grid-template-columns:130px 1fr 74px;align-items:center;gap:12px}
.dash .hbar-lab{font-size:12.5px;color:#2E5573;text-align:right;font-weight:500}
.dash .hbar-track{position:relative;background:#F0F8FD;border-radius:8px;height:26px;overflow:hidden}
.dash .hbar-fill{height:26px;border-radius:8px;min-width:4px;transition:width .5s cubic-bezier(.2,.7,.2,1)}
.dash .hbar-val{font-family:'Plus Jakarta Sans','Noto Sans Thai';display:flex;align-items:baseline;gap:6px}
.dash .hbar-val b{font-size:13px;font-weight:800;color:#1B3D5C}
.dash .hbar-val em{font-style:normal;font-size:11px;font-weight:600;color:#6B7B8D}
.dash .dn-wrap{display:flex;gap:20px;align-items:center;flex-wrap:wrap;justify-content:center}
.dash .donut .dn-top{font-size:23px;font-weight:800;fill:#1B3D5C;font-family:'Plus Jakarta Sans','Noto Sans Thai'}
.dash .donut .dn-sub{font-size:11px;fill:#6B7B8D}
.dash .legend{list-style:none;display:flex;flex-direction:column;gap:8px;min-width:150px}
.dash .legend li{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#2E5573}
.dash .legend .dot{width:11px;height:11px;border-radius:3px;flex-shrink:0}
.dash .legend .lg-lab{flex:1}
.dash .legend .lg-val{font-weight:700;color:#1B3D5C;font-family:'Plus Jakarta Sans','Noto Sans Thai'}
.dash .legend .lg-val em{color:#6B7B8D;font-weight:500;font-style:normal;font-size:11px}
.dash .vbars{display:flex;align-items:flex-end;gap:10px;height:180px;padding-top:10px}
.dash .vb{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px}
.dash .vb-bar{width:100%;max-width:46px;border-radius:8px 8px 0 0;transition:height .5s}
.dash .vb-val{font-family:'Plus Jakarta Sans','Noto Sans Thai';text-align:center;line-height:1.15;display:flex;flex-direction:column;align-items:center}
.dash .vb-val b{font-size:13px;font-weight:800;color:#1B3D5C}
.dash .vb-val small{font-size:10px;font-weight:600;color:#6B7B8D}
.dash .vb-lab{font-size:10.5px;color:#6B7B8D;text-align:center}
.dash .funnel{display:flex;flex-direction:column;gap:10px}
.dash .fn-row{display:grid;grid-template-columns:180px 1fr;align-items:center;gap:12px}
.dash .fn-lab{font-size:12.5px;color:#2E5573;text-align:right;font-weight:600;display:flex;flex-direction:column}
.dash .fn-lab small{font-weight:400;color:#6B7B8D;font-size:10.5px}
.dash .fn-track{position:relative;display:flex;align-items:center;gap:10px}
.dash .fn-fill{height:38px;border-radius:9px;display:flex;align-items:center;padding-left:14px;transition:width .6s cubic-bezier(.2,.7,.2,1)}
.dash .fn-n{color:#fff;font-weight:800;font-size:16px;font-family:'Plus Jakarta Sans','Noto Sans Thai'}
.dash .fn-pct{font-size:12.5px;font-weight:700;color:#2E5573;font-family:'Plus Jakarta Sans','Noto Sans Thai'}
.dash .axl{font-size:10px;fill:#6B7B8D;font-family:'Plus Jakarta Sans','Noto Sans Thai'}
.dash .sk{overflow:visible}
.dash .sk path{transition:fill-opacity .15s}
.dash .sk path:hover{fill-opacity:.62!important}
.dash .sk text{paint-order:stroke;stroke:#FDFEFF;stroke-width:2.6px;stroke-linejoin:round}
.dash .sk-lab{font-size:11px;font-weight:700;fill:#1B3D5C;font-family:'Noto Sans Thai','Plus Jakarta Sans'}
.dash .sk-val{font-size:10px;fill:#6B7B8D;font-family:'Plus Jakarta Sans','Noto Sans Thai';font-weight:700}
.dash .sk-pct{fill:#2B86B5}
.dash .pillrow{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
.dash .mini{background:#F0F8FD;border:1px solid #D6EFFA;border-radius:12px;padding:10px 14px;flex:1;min-width:120px}
.dash .mini .m-v{font-size:20px;font-weight:800;color:#1B3D5C;font-family:'Plus Jakarta Sans','Noto Sans Thai'}
.dash .mini .m-l{font-size:11.5px;color:#6B7B8D}
.dash .empty{padding:34px 10px;text-align:center;color:#6B7B8D;font-size:13px}
.dash .empty .eg{font-size:30px;display:block;margin-bottom:6px}
@media(max-width:900px){.dash .kpis{grid-template-columns:repeat(3,1fr)}.dash .g2,.dash .g3{grid-template-columns:1fr}.dash .cf{margin-left:0}}
@media(max-width:560px){.dash .kpis{grid-template-columns:repeat(2,1fr)}.dash .hbar{grid-template-columns:100px 1fr 66px}.dash .fn-row{grid-template-columns:120px 1fr}}
`;

function Kpi({ id, icon, bg, label }: { id: string; icon: string; bg: string; label: string }) {
  return (
    <div className="kpi">
      <div className="kpi-ic" style={{ background: bg }}>{icon}</div>
      <div>
        <div className="kpi-val" id={id}>–</div>
        <div className="kpi-lab">{label}</div>
        <div className="kpi-sub" id={`${id}-s`} />
      </div>
    </div>
  );
}

const CHIPS: [string, string, string][] = [["all", "ทั้งหมด", "All"], ["60", "60 วัน", "60d"], ["30", "30 วัน", "30d"], ["15", "15 วัน", "15d"], ["7", "7 วัน", "7d"], ["3", "3 วัน", "3d"], ["24h", "24 ชม.", "24h"]];

export default function DashboardView({ data, lang = "th" }: { data: DashboardData; lang?: Lang }) {
  useEffect(() => mountDashboard(data, lang), [data, lang]);

  const asOf = new Date(data.now).toLocaleString(dateLocale(lang), { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="dash">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header>
        <div className="hd">
          <a href="/admin" style={{ fontSize: 13, color: "#2E5573", textDecoration: "none", fontWeight: 600 }}>← {t(lang, "กลับ", "Back")}</a>
          <ItinerryLogo size="sm" />
          <h1>{t(lang, "แดชบอร์ดวิเคราะห์ผู้ใช้", "User analytics dashboard")}</h1>
          <span className="pill">{t(lang, "ข้อมูล ณ", "As of")} {asOf}{t(lang, " น.", "")}</span>
          <AdminLangToggle lang={lang} />
        </div>
        <div className="filters">
          <span className="f-lbl">{t(lang, "ย้อนหลัง:", "Range:")}</span>
          {CHIPS.map(([k, th, en]) => (
            <button key={k} type="button" className={`chip${k === "all" ? " on" : ""}`} data-k={k}>{lang === "en" ? en : th}</button>
          ))}
          <div className="cf">
            <span>{t(lang, "ช่วงเวลา", "Custom")}</span>
            <input type="date" id="cf-from" />
            <span>→</span>
            <input type="date" id="cf-to" />
            <button id="cf-apply" type="button">{t(lang, "ใช้", "Apply")}</button>
          </div>
        </div>
        <div className="readout" id="readout" />
        <nav className="sub">
          <a href="#overview">{t(lang, "ภาพรวม", "Overview")}</a>
          <a href="#funnel">Funnel &amp; {t(lang, "ปิดดีล", "Closing")}</a>
          <a href="#acq">{t(lang, "ช่องทาง & เติบโต", "Channels & Growth")}</a>
          <a href="#demand">{t(lang, "ดีมานด์", "Demand")}</a>
          <a href="#profile">{t(lang, "โปรไฟล์", "Profile")}</a>
        </nav>
      </header>

      <div className="wrap">
        <div className="hero" id="overview">
          <div className="sec-h"><h2>{t(lang, "ภาพรวม", "Overview")}</h2></div>
          <div className="sub">{t(lang, "แดชบอร์ดวิเคราะห์ผู้ใช้และเคสประเมินวีซ่า — เลือกช่วงเวลาด้านบนเพื่อกรองทุกกราฟ", "Analytics for users and visa-assessment cases — pick a range above to filter every chart.")}</div>
        </div>

        <div className="kpis">
          <Kpi id="k-users" icon="👥" bg="#D6EFFA" label={t(lang, "ผู้ใช้ใหม่", "New users")} />
          <Kpi id="k-friends" icon="💚" bg="#D4F1E4" label={t(lang, "เพื่อน LINE", "LINE friends")} />
          <Kpi id="k-assess" icon="📝" bg="#F0F8FD" label={t(lang, "เคสประเมินใหม่", "New cases")} />
          <Kpi id="k-score" icon="⭐" bg="#FFF3D6" label={t(lang, "คะแนนเฉลี่ย", "Avg. score")} />
          <Kpi id="k-pass" icon="✅" bg="#D4F1E4" label={t(lang, "อัตราผ่านเกณฑ์", "Pass rate")} />
          <Kpi id="k-won" icon="🤝" bg="#D6EFFA" label={t(lang, "ปิดดีลได้", "Deals won")} />
        </div>

        <section id="funnel">
          <div className="sec-h"><h2>Funnel &amp; {t(lang, "การปิดดีล", "Closing")}</h2><span>{t(lang, "เส้นทางจากผู้สนใจ → ลูกค้า", "From lead → customer")}</span></div>
          <div className="grid g2">
            <div className="card"><h3>{t(lang, "กรวยการปิดดีล (Conversion Funnel)", "Conversion Funnel")}</h3><div id="c-funnel" /><div className="insight" id="i-funnel" /></div>
            <div className="card"><h3>{t(lang, "สถานะเคสใน Pipeline", "Case status in the pipeline")}</h3><div id="c-status" /><div className="insight" id="i-lost" /></div>
          </div>
          <div className="grid" style={{ marginTop: 16 }}>
            <div className="card"><h3>{t(lang, "เส้นทางการไหลของสถานะ (Sankey)", "State flow path (Sankey)")}</h3><p className="cap" id="cap-sankey" /><div id="c-sankey" /><div className="insight" id="i-sankey" /></div>
          </div>
        </section>

        <section id="acq">
          <div className="sec-h"><h2>{t(lang, "ช่องทาง & การเติบโต", "Channels & Growth")}</h2><span>{t(lang, "ผู้ใช้มาจากไหน โตเร็วแค่ไหน", "Where users come from, how fast it grows")}</span></div>
          <div className="grid g2">
            <div className="card">
              <h3>{t(lang, "ผู้ใช้ใหม่รายวัน & สะสม", "New users daily & cumulative")}</h3>
              <div id="c-line" />
              <div className="pillrow">
                <div className="mini"><div className="m-v" id="m-peak">–</div><div className="m-l" id="m-peak-l">{t(lang, "วันพีค", "Peak day")}</div></div>
                <div className="mini"><div className="m-v" id="m-avg">–</div><div className="m-l">{t(lang, "เฉลี่ย/วัน", "Avg/day")}</div></div>
                <div className="mini"><div className="m-v" id="m-friend">–</div><div className="m-l">{t(lang, "เป็นเพื่อน LINE", "Are LINE friends")}</div></div>
              </div>
            </div>
            <div className="card"><h3>{t(lang, "ช่องทางที่รู้จัก itinerry", "How they found itinerry")}</h3><div id="c-source" className="dn-wrap" /><div className="insight" id="i-source" /></div>
          </div>
        </section>

        <section id="demand">
          <div className="sec-h"><h2>{t(lang, "ปลายทาง & ประเภทวีซ่า", "Destinations & visa types")}</h2><span>{t(lang, "คนอยากไปไหน วีซ่าประเภทใด", "Where they want to go, which visa")}</span></div>
          <div className="grid g2">
            <div className="card"><h3>{t(lang, "ปลายทางยอดนิยม", "Popular destinations")}</h3><p className="cap" id="cap-dest" /><div id="c-dest" /></div>
            <div className="card"><h3>{t(lang, "ประเภทวีซ่า", "Visa types")}</h3><div id="c-visa" className="dn-wrap" /><div className="insight" id="i-visa" /></div>
          </div>
        </section>

        <section id="profile">
          <div className="sec-h"><h2>{t(lang, "โปรไฟล์ผู้ใช้ & คะแนน", "User profiles & ratings")}</h2><span>{t(lang, "ใครคือคนที่เข้ามา", "Who is coming in")}</span></div>
          <div className="grid g3">
            <div className="card"><h3>{t(lang, "อาชีพ", "Occupation")}</h3><div id="c-occ" /></div>
            <div className="card"><h3>{t(lang, "ความพร้อม/ความตั้งใจ", "Readiness / intent")}</h3><div id="c-intent" /><div className="insight" id="i-intent" /></div>
            <div className="card"><h3>{t(lang, "ช่องทางติดต่อที่เลือก", "Preferred contact")}</h3><div id="c-contact" className="dn-wrap" /></div>
          </div>
          <div className="grid g2" style={{ marginTop: 16 }}>
            <div className="card"><h3>{t(lang, "การกระจายคะแนนประเมิน", "Score distribution")}</h3><p className="cap" id="cap-hist" /><div id="c-hist" /><div className="insight" id="i-hist" /></div>
            <div className="card"><h3>{t(lang, "ความผูกพันกับไทย (จุดแข็งวีซ่า)", "Ties to Thailand (visa strengths)")}</h3><p className="cap" id="cap-ties" /><div id="c-ties" /></div>
          </div>
        </section>
      </div>
    </div>
  );
}
