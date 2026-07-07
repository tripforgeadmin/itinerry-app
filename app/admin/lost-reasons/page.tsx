import Link from "next/link";
import { fetchLostReasonTree } from "@/lib/lost-reasons";
import LostReasonManager from "./LostReasonManager";

export const dynamic = "force-dynamic";

export default async function LostReasonsAdminPage() {
  const tree = await fetchLostReasonTree(false); // include inactive so admins can re-enable

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← กลับ</Link>
          <h1 className="text-xl font-bold text-gray-800">เหตุผลปิดดีล (Closed Lost)</h1>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          รายการเหตุผลที่แอดมินเลือกตอนปิดเคสเป็น Closed Lost (2 ระดับ: หมวดหลัก → เหตุผลย่อย) — แก้ที่นี่มีผลกับ dropdown ตอนปิดดีลทันที
          ปิดใช้งาน (ซ่อน) ได้โดยไม่ลบ เพื่อไม่ให้เคสเก่าที่อ้างอิงอยู่เสียข้อมูล
        </p>
        <LostReasonManager initialTree={tree} />
      </div>
    </main>
  );
}
