import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

const VISA_LABEL: Record<string, string> = {
  tourist: "ท่องเที่ยว",
  visitor: "เยี่ยมเยียน",
  business: "ธุรกิจ",
  student: "นักเรียน",
};

export interface NewLeadParams {
  assessmentId: string;
  fullName: string;
  phone: string;
  visaType: string;
  destination: string;
  travelArrival: string;
  travelReturn: string;
  contactPreference: string;
  appUrl: string;
  pdfBuffer?: Buffer;
}

export async function sendNewLeadEmail(params: NewLeadParams) {
  const { assessmentId, fullName, phone, visaType, destination, travelArrival, travelReturn, contactPreference, appUrl, pdfBuffer } = params;

  const visaLabel = VISA_LABEL[visaType] ?? visaType;
  const subject = `[New Lead] ${fullName} · ${visaLabel} · ${destination.toUpperCase()}`;
  const adminUrl = `${appUrl}/admin/${assessmentId}`;
  const contactLabel = contactPreference === "line" ? "LINE OA" : "โทรกลับ";

  const { error } = await getResend().emails.send({
    from: "no-reply@tripforge.co",
    to: "info@tripforge.co",
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1e293b;margin-bottom:4px">Lead ใหม่เข้ามาแล้ว 🎉</h2>
        <p style="color:#64748b;margin-top:0">${new Date().toLocaleString("th-TH", { dateStyle: "long", timeStyle: "short" })}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 0;color:#64748b;width:130px">ชื่อ</td><td style="padding:8px 0;font-weight:600;color:#1e293b">${fullName}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">เบอร์โทร</td><td style="padding:8px 0;color:#1e293b">${phone}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">วีซ่า</td><td style="padding:8px 0;color:#1e293b">${visaLabel}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">ปลายทาง</td><td style="padding:8px 0;color:#1e293b">${destination.toUpperCase()}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">วันเดินทาง</td><td style="padding:8px 0;color:#1e293b">${travelArrival || "—"}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">วันกลับ</td><td style="padding:8px 0;color:#1e293b">${travelReturn || "—"}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">ช่องทางติดต่อ</td><td style="padding:8px 0;color:#1e293b">${contactLabel}</td></tr>
        </table>
        <a href="${adminUrl}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600">ดูรายละเอียด →</a>
      </div>
    `,
    attachments: pdfBuffer
      ? [{ filename: "assessment.pdf", content: pdfBuffer }]
      : undefined,
  });
  if (error) console.error("resend error:", JSON.stringify(error));
}
