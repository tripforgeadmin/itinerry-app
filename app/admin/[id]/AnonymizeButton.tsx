"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "./ConfirmModal";
import { t, type Lang } from "@/lib/i18n";

export default function AnonymizeButton({ accountId, lang = "th" }: { accountId: string; lang?: Lang }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  async function handleConfirm() {
    setLoading(true);
    const res = await fetch("/api/admin/anonymize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    setLoading(false);
    if (res.ok) {
      setModalOpen(false);
      router.refresh();
    } else {
      alert(t(lang, "เกิดข้อผิดพลาด กรุณาลองใหม่", "Something went wrong. Please try again."));
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={t(lang, "เมนูเพิ่มเติม", "More")}
        className="w-8 h-8 grid place-items-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 leading-none text-xl font-bold"
      >
        ⋮
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 z-10 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[180px]">
          <button
            onClick={() => {
              setMenuOpen(false);
              setModalOpen(true);
            }}
            className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            {t(lang, "ลบข้อมูลส่วนตัว (PDPA)", "Delete personal data (PDPA)")}
          </button>
        </div>
      )}
      <ConfirmModal
        open={modalOpen}
        title={t(lang, "ยืนยันการลบข้อมูลส่วนตัว", "Confirm personal-data deletion")}
        message={t(
          lang,
          "ยืนยันการลบข้อมูลส่วนตัวของลูกค้ารายนี้?\n\nชื่อ, เบอร์, อีเมล และข้อมูล LINE จะถูกลบถาวร ไม่สามารถย้อนกลับได้",
          "Delete this customer's personal data?\n\nName, phone, email and LINE data will be permanently removed. This cannot be undone."
        )}
        confirmLabel={t(lang, "ยืนยัน", "Confirm")}
        danger
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
}
