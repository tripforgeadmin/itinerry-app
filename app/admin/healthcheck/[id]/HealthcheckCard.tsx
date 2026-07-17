/* eslint-disable @next/next/no-img-element */
import type { HealthcheckData } from "@/lib/healthcheck-data";
import { countdownCopy, t } from "@/lib/healthcheck-data";

const NAVY = "#1b3d5c";
const ACCENT = "#44a8db";
const HERO_BG = "#eaf6fd";
const MUTED = "#5c7a93";

/**
 * The customer-facing Visa Health Check card — plain HTML/CSS rendered in the admin's
 * browser (perfect Thai shaping; satori could not stack tone marks over upper vowels).
 * Fixed 1080px design width: printing scales it via CSS zoom, and the send flow exports
 * this exact DOM to PNG. Keep it dependency-free and style-inline so DOM→image export
 * captures everything.
 */
export default function HealthcheckCard({ data: d, flagSrc }: { data: HealthcheckData; flagSrc: string | null }) {
  const lang = d.lang;
  const cd = countdownCopy(lang, d.daysLeft);
  const hasAssessment = d.tiesWord !== "—" || d.fundingWord !== "—" || d.travelHistoryWord !== "—" || d.approvalWord !== "—";
  const evalBadge = d.evaluatedAt
    ? new Date(d.evaluatedAt).toLocaleString(lang === "th" ? "th-TH" : "en-GB", {
        timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      }) + (lang === "th" ? " น." : "")
    : "";

  return (
    <div
      id="healthcheck-card"
      style={{ display: "flex", flexDirection: "column", width: 1080, backgroundColor: "#ffffff", fontFamily: "'Prompt', 'Sarabun', sans-serif" }}
    >
      {/* hero band */}
      <div style={{ display: "flex", flexDirection: "column", backgroundColor: HERO_BG, padding: "36px 52px 30px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* single brand logo (cropped to content), sized to the header height */}
          <img src="/itin-logo.png" width={210} height={65} alt="itinerry" style={{ objectFit: "contain" }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginLeft: "auto" }}>
            <div style={{ display: "flex", backgroundColor: "#ffffff", borderRadius: 999, padding: "10px 22px", fontSize: 20, fontWeight: 600, color: NAVY }}>
              {t(lang, "ประเมินเบื้องต้น", "Preliminary assessment")} · {evalBadge}
            </div>
            <div style={{ display: "flex", fontSize: 17, color: MUTED, marginTop: 8 }}>{d.ticketId}</div>
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", fontSize: 20, fontWeight: 700, color: ACCENT, letterSpacing: 4 }}>
              🩺 VISA HEALTH CHECK
            </div>
            <div style={{ fontSize: 58, fontWeight: 700, color: NAVY, marginTop: 4, lineHeight: 1.2 }}>
              {t(lang, "ผลตรวจสุขภาพวีซ่า", "Your Visa Health Check")}
            </div>
            <div style={{ fontSize: 22, color: MUTED, marginTop: 6, lineHeight: 1.45 }}>
              {t(lang,
                "สรุปเบื้องต้นจากข้อมูลที่คุณกรอกเข้ามา — เพื่อวางแผนให้พร้อมก่อนยื่นจริง",
                "A first-pass summary from what you told us — so we can plan before the real application")}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 20 }}>
              {/* name pill — widened + roomy so long names fit; wraps to its own row if needed */}
              <div style={{ display: "flex", alignItems: "center", backgroundColor: "#ffffff", borderRadius: 999, padding: "10px 26px", fontSize: 21, fontWeight: 600, color: NAVY, minWidth: 320, whiteSpace: "nowrap" }}>
                👤 {d.customerName}
              </div>
              <div style={{ display: "flex", alignItems: "center", backgroundColor: "#ffffff", borderRadius: 999, padding: "10px 22px", fontSize: 21, fontWeight: 600, color: NAVY }}>
                {flagSrc && <img src={flagSrc} width={30} height={20} alt="" style={{ borderRadius: 4, marginRight: 10 }} />}
                {d.destName} · {d.visaLabel}
              </div>
              <div style={{ display: "flex", alignItems: "center", backgroundColor: "#ffffff", borderRadius: 999, padding: "10px 22px", fontSize: 21, fontWeight: 600, color: NAVY }}>
                🤝 {d.slot3Value}
              </div>
              <div style={{ display: "flex", alignItems: "center", backgroundColor: "#ffffff", borderRadius: 999, padding: "10px 22px", fontSize: 21, fontWeight: 600, color: NAVY }}>
                🗓️ {d.travelLabel}
              </div>
            </div>
          </div>
          <img src="/mascot/itin_thai-passport-cut.png" width={210} height={210} alt="" style={{ marginLeft: 16, objectFit: "contain" }} />
        </div>
      </div>

      {/* body */}
      <div style={{ display: "flex", flexDirection: "column", padding: "30px 52px 0" }}>
        {/* assessment factors — words only, no score/band/color (see tone contract in healthcheck-data.ts) */}
        {hasAssessment && (
          <div style={{ display: "flex", flexDirection: "column", border: "2px solid #e3eef6", borderRadius: 24, padding: "26px 30px 4px" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: NAVY, marginBottom: 20 }}>
              📊 {t(lang, "ผลประเมิน", "Assessment")}
            </div>
            <div style={{ display: "flex", flexWrap: "nowrap", gap: 12 }}>
              <Cell icon="🏠" label={t(lang, "ความผูกพันในไทย", "Ties in Thailand")} value={d.tiesWord} />
              <Cell icon="💰" label={t(lang, "การเงิน", "Funding")} value={d.fundingWord} />
              <Cell icon="🧳" label={t(lang, "ประวัติการเดินทาง", "Travel history")} value={d.travelHistoryWord} />
              <Cell icon="📈" label={t(lang, "โอกาสผ่าน", "Approval chance")} value={d.approvalWord} />
            </div>
          </div>
        )}

        {/* countdown */}
        <div style={{ display: "flex", alignItems: "center", backgroundColor: "#f2f9fe", borderRadius: 24, padding: "24px 30px", marginTop: hasAssessment ? 22 : 0 }}>
          {d.daysLeft !== null && d.daysLeft >= 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingRight: 30, marginRight: 30, borderRight: "2px solid #d9ebf7" }}>
              <div style={{ fontSize: 62, fontWeight: 700, color: ACCENT, lineHeight: 1 }}>{d.daysLeft}</div>
              <div style={{ fontSize: 20, color: MUTED }}>{t(lang, "วันก่อนเดินทาง", "days to go")}</div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 21, color: NAVY, lineHeight: 1.5 }}>{cd.copy}</div>
            <div style={{ display: "flex", marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", backgroundColor: cd.pillBg, color: cd.pillColor, borderRadius: 999, padding: "7px 18px", fontSize: 19, fontWeight: 600 }}>
                <span style={{ display: "flex", width: 10, height: 10, borderRadius: 5, backgroundColor: cd.pillColor, marginRight: 10 }} />
                {cd.pill}
              </div>
            </div>
          </div>
        </div>

        {/* strengths / improvements */}
        <div style={{ display: "flex", alignItems: "stretch", marginTop: 22 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, backgroundColor: "#eaf7ef", borderRadius: 24, padding: "26px 28px", marginRight: 20 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1c7a4b", marginBottom: 14 }}>
              ✅ {t(lang, "จุดแข็งของคุณ", "Your strengths")}
            </div>
            {d.strengths.map((x, i) => (
              <div key={i} style={{ display: "flex", fontSize: 20, color: "#173f2b", lineHeight: 1.45, marginBottom: 10 }}>
                <span style={{ display: "flex", width: 9, height: 15, borderRight: "3.5px solid #2aa565", borderBottom: "3.5px solid #2aa565", transform: "rotate(45deg)", marginRight: 14, marginTop: 3, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{x}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, backgroundColor: "#fdf6df", borderRadius: 24, padding: "26px 28px" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#9a6a00", marginBottom: 14 }}>
              ➕ {t(lang, "ที่เราจะช่วยเสริม", "Where we'll help")}
            </div>
            {d.improvements.map((x, i) => (
              <div key={i} style={{ display: "flex", fontSize: 20, color: "#4d3a10", lineHeight: 1.45, marginBottom: 10 }}>
                <span style={{ color: "#d99a1b", marginRight: 10, fontWeight: 700, flexShrink: 0 }}>+</span>
                <span style={{ flex: 1 }}>{x}</span>
              </div>
            ))}
          </div>
        </div>

        {/* extra comment (admin notes) */}
        {d.notes && (
          <div style={{ display: "flex", flexDirection: "column", backgroundColor: "#f4f7fa", borderRadius: 24, padding: "22px 28px", marginTop: 22 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 8 }}>
              💬 {t(lang, "ความเห็นเพิ่มเติม", "A note from our team")}
            </div>
            <div style={{ fontSize: 20, color: "#33475b", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{d.notes}</div>
          </div>
        )}

        {/* promise banner */}
        <div style={{ display: "flex", flexDirection: "column", backgroundColor: NAVY, borderRadius: 24, padding: "26px 32px", marginTop: 22 }}>
          <div style={{ fontSize: 27, fontWeight: 700, color: "#ffffff", lineHeight: 1.5 }}>
            {t(lang, "เราไม่ได้การันตีวีซ่า — แต่การันตีว่า", "We don't guarantee the visa — we guarantee")}{" "}
            <span style={{ color: "#fed984" }}>
              {t(lang, "เอกสารของคุณจะแน่นที่สุด", "your strongest possible application")}
            </span>
          </div>
          <div style={{ fontSize: 20, color: "#bcd3e5", marginTop: 6 }}>
            {t(lang, "วีซ่ายากแค่ไหน เราเคยเจอมาแล้ว ค่อย ๆ ทำไปด้วยกัน 💙", "However hard the case, we've seen it before. Let's take it step by step 💙")}
          </div>
        </div>
      </div>

      {/* footer CTA — follow on itinerry social (Instagram @itinerry.visa + Facebook itinerry) */}
      <div style={{ display: "flex", alignItems: "center", backgroundColor: ACCENT, padding: "34px 52px", marginTop: 26 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#ffffff" }}>
            {t(lang, "คุยต่อกับผู้เชี่ยวชาญใน itinerry", "Talk to an itinerry expert")}
          </div>
          <div style={{ display: "flex", alignItems: "center", fontSize: 21, color: "#eaf6fd", marginTop: 8 }}>
            {t(lang, "ติดตามเราทางโซเชียล ทีมช่วยดูให้ทีละขั้น", "Follow us on social — we'll walk you through it")}
            <span style={{ display: "flex", backgroundColor: "#fed984", color: "#5d4200", borderRadius: 999, padding: "5px 16px", fontSize: 18, fontWeight: 700, marginLeft: 14 }}>
              {t(lang, "ประเมินฟรี", "Free review")}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ fontSize: 17, color: "#eaf6fd", marginBottom: 10 }}>{t(lang, "ติดตามเรา", "Follow us")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <SocialPill glyph={<InstagramGlyph />} handle="@itinerry.visa" />
            <SocialPill glyph={<FacebookGlyph />} handle="itinerry" />
          </div>
        </div>
      </div>

      {/* disclaimer */}
      <div style={{ padding: "14px 52px 20px", fontSize: 15, color: "#8ba3b8", lineHeight: 1.5 }}>
        {t(lang,
          "เอกสารนี้เป็นการประเมินเบื้องต้นจากข้อมูลที่กรอกในแบบฟอร์ม เพื่อใช้วางแผนเตรียมเอกสารเท่านั้น — ไม่ใช่การตัดสินผลวีซ่าอย่างเป็นทางการ ผลการพิจารณาขึ้นอยู่กับสถานทูต · © itinerry Visa Consulting",
          "This is a preliminary assessment based on the information you submitted, intended for document planning only — not an official visa decision. Outcomes rest with the embassy. © itinerry Visa Consulting")}
      </div>
    </div>
  );
}

function Cell({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, textAlign: "center", marginBottom: 22 }}>
      <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 16, color: MUTED, lineHeight: 1.3 }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>{value}</div>
    </div>
  );
}

/** White social chip (icon + handle) matching the old LINE-button look. Inline-SVG glyphs so
 *  the DOM→PNG export (html-to-image) renders them crisply with no external asset fetch. */
function SocialPill({ glyph, handle }: { glyph: React.ReactNode; handle: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", backgroundColor: "#ffffff", borderRadius: 999, padding: "9px 22px 9px 14px", minWidth: 210 }}>
      <div style={{ display: "flex", alignItems: "center", marginRight: 10 }}>{glyph}</div>
      <span style={{ fontSize: 21, fontWeight: 700, color: NAVY }}>{handle}</span>
    </div>
  );
}

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke="#d6318c" strokeWidth={2}>
      <rect x="2.2" y="2.2" width="19.6" height="19.6" rx="5.5" />
      <circle cx="12" cy="12" r="4.6" />
      <circle cx="17.6" cy="6.4" r="1.35" fill="#d6318c" stroke="none" />
    </svg>
  );
}

function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={26} height={26} fill="#1877f2">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}
