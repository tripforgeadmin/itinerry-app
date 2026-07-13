import Link from "next/link";
import { getAdminLang } from "@/lib/admin-lang";
import { t } from "@/lib/i18n";
import ManualCaseForm from "./ManualCaseForm";

export const dynamic = "force-dynamic";

export default async function ManualCasePage() {
  const lang = await getAdminLang();
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">✍️ {t(lang, "เพิ่มเคสด้วยตนเอง", "New Manual Case")}</h1>
          <Link href="/admin" className="text-sm font-medium text-blue-600 hover:text-blue-800">
            ← {t(lang, "กลับ", "Back")}
          </Link>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          {t(
            lang,
            "สำหรับเคสที่ OPS คุยกับลูกค้าทางโทรศัพท์แล้ว แต่ลูกค้ายังไม่ได้ทำแบบสอบถามผ่านแอป",
            "For cases OPS already discussed with the customer by phone, but the customer hasn't filled the app's own questionnaire"
          )}
        </p>
        <ManualCaseForm lang={lang} />
      </div>
    </main>
  );
}
