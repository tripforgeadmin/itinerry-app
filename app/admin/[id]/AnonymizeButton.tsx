"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "./ConfirmModal";

export default function AnonymizeButton({ accountId }: { accountId: string }) {
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
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="เมนูเพิ่มเติม"
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
            ลบข้อมูลส่วนตัว (PDPA)
          </button>
        </div>
      )}
      <ConfirmModal
        open={modalOpen}
        title="ยืนยันการลบข้อมูลส่วนตัว"
        message={
          "ยืนยันการลบข้อมูลส่วนตัวของลูกค้ารายนี้?\n\nชื่อ, เบอร์, อีเมล และข้อมูล LINE จะถูกลบถาวร ไม่สามารถย้อนกลับได้"
        }
        confirmLabel="ยืนยัน"
        danger
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
}
