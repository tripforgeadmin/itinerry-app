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
          {/* logo scaled to full header height per owner note */}
          <img src="/logo-iti.svg" width={62} height={58} alt="" />
          <img src="/logo-nerry.svg" width={160} height={49} alt="itinerry" style={{ marginLeft: 6, marginTop: 10 }} />
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
            <div style={{ display: "flex", marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", backgroundColor: "#ffffff", borderRadius: 999, padding: "10px 22px", fontSize: 21, fontWeight: 600, color: NAVY, marginRight: 12 }}>
                👤 {d.customerName}
              </div>
              <div style={{ display: "flex", alignItems: "center", backgroundColor: "#ffffff", borderRadius: 999, padding: "10px 22px", fontSize: 21, fontWeight: 600, color: NAVY }}>
                {flagSrc && <img src={flagSrc} width={30} height={20} alt="" style={{ borderRadius: 4, marginRight: 10 }} />}
                {d.destName} · {d.visaLabel}
              </div>
            </div>
          </div>
          <img src="/mascot/itin_thai-passport-cut.png" width={210} height={210} alt="" style={{ marginLeft: 16, objectFit: "contain" }} />
        </div>
      </div>

      {/* body */}
      <div style={{ display: "flex", flexDirection: "column", padding: "30px 52px 0" }}>
        {/* travel info card */}
        <div style={{ display: "flex", flexDirection: "column", border: "2px solid #e3eef6", borderRadius: 24, padding: "26px 30px 4px" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: NAVY, marginBottom: 20 }}>
            📘 {t(lang, "ข้อมูลการเดินทางของคุณ", "Your trip at a glance")}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between" }}>
            <Cell icon="📍" label={t(lang, "ปลายทาง", "Destination")} value={d.destName} />
            <Cell icon="🛂" label={t(lang, "ประเภทวีซ่า", "Visa type")} value={d.visaLabel} />
            <Cell icon="🤝" label={d.slot3Label} value={d.slot3Value} />
            <Cell icon="🗓️" label={t(lang, "กำหนดเดินทาง", "Planned travel")} value={d.travelLabel} />
          </div>
        </div>

        {/* countdown */}
        <div style={{ display: "flex", alignItems: "center", backgroundColor: "#f2f9fe", borderRadius: 24, padding: "24px 30px", marginTop: 22 }}>
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
            <div style={{ fontSize: 20, color: "#33475b", lineHeight: 1.5 }}>{d.notes}</div>
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

      {/* footer CTA */}
      <div style={{ display: "flex", alignItems: "center", backgroundColor: ACCENT, padding: "30px 52px", marginTop: 26 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#ffffff" }}>
            {t(lang, "คุยต่อกับพี่ itinerry", "Talk to the itinerry team")}
          </div>
          <div style={{ display: "flex", alignItems: "center", fontSize: 21, color: "#eaf6fd", marginTop: 8 }}>
            {t(lang, "แอดไลน์แล้วส่งเคสนี้เข้ามา ทีมช่วยดูให้ทีละขั้น", "Add us on LINE and send this case in — we'll walk you through it")}
            <span style={{ display: "flex", backgroundColor: "#fed984", color: "#5d4200", borderRadius: 999, padding: "5px 16px", fontSize: 18, fontWeight: 700, marginLeft: 14 }}>
              {t(lang, "ประเมินเชิงลึก ฟรี", "Free in-depth review")}
            </span>
          </div>
          <div style={{ display: "flex", marginTop: 16 }}>
            <span style={{ display: "flex", alignItems: "center", backgroundColor: "#ffffff", borderRadius: 999, padding: "10px 24px", fontSize: 23, fontWeight: 700, color: "#06C755" }}>
              LINE OA @448yxrvh
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <img src="/line/qrcode-default.png" width={196} height={221} alt="LINE QR" style={{ borderRadius: 20 }} />
          <div style={{ fontSize: 17, color: "#ffffff", marginTop: 6 }}>
            {t(lang, "สแกนเพื่อแอดไลน์", "Scan to add us on LINE")}
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
    <div style={{ display: "flex", alignItems: "flex-start", width: "47%", marginBottom: 26 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 16, backgroundColor: HERO_BG, fontSize: 26, marginRight: 16, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontSize: 19, color: MUTED }}>{label}</div>
        <div style={{ fontSize: 25, fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>{value}</div>
      </div>
    </div>
  );
}
