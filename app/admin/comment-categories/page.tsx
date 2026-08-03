import Link from "next/link";
import { fetchCommentCategories } from "@/lib/comment-categories";
import CommentCategoryManager from "./CommentCategoryManager";

export const dynamic = "force-dynamic";

export default async function CommentCategoriesAdminPage() {
  const categories = await fetchCommentCategories(false); // include inactive so admins can re-enable

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← กลับ</Link>
          <h1 className="text-xl font-bold text-gray-800">หมวดปัญหา & แนวทางแก้ (Case Comment)</h1>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          หมวดที่ จนท. เลือกตอนบันทึกปัญหา/แนวทางแก้ในหน้าเคส — หมวดปัญหา (Pain Point) ถูกใช้เป็นเงื่อนไข
          ยิงข้อความอัตโนมัติใน Broadcast System ด้วย ปิดใช้งาน (ซ่อน) ได้โดยไม่ลบ เพื่อไม่ให้เคสเก่าเสียข้อมูล
        </p>
        <CommentCategoryManager initial={categories} />
      </div>
    </main>
  );
}
