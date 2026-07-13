"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";

const LINE_ID_RE = /^U[0-9a-f]{32}$/;

export default function LinkLineButton({ accountId, lang = "th" }: { accountId: string; lang?: Lang }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const valid = LINE_ID_RE.test(value.trim());

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/link-line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, lineUserId: value.trim() }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error ?? "failed");
      setOpen(false);
      setValue("");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t(lang, "บันทึกไม่สำเร็จ", "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
      >
        {t(lang, "+ ผูก LINE ทีหลัง", "+ Link LINE later")}
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="U0123456789abcdef0123456789abcdef"
        className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-mono w-72"
      />
      <button
        type="button"
        disabled={!valid || saving}
        onClick={save}
        className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white disabled:opacity-40"
      >
        {saving ? t(lang, "กำลังบันทึก…", "Saving…") : t(lang, "บันทึก", "Save")}
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setErr(null);
        }}
        className="text-xs text-gray-400"
      >
        {t(lang, "ยกเลิก", "Cancel")}
      </button>
      {err && <span className="text-xs text-red-500">{err}</span>}
    </div>
  );
}
