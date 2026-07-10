"use client";

import { useState } from "react";
import { t, type Lang } from "@/lib/i18n";

export default function CopyLineIdButton({ userId, lang = "th" }: { userId: string | null; lang?: Lang }) {
  const [copied, setCopied] = useState(false);

  if (!userId) return null;

  async function handleCopy() {
    if (!userId) return;
    await navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={handleCopy}
      className="px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 transition-opacity hover:bg-gray-200"
    >
      {copied ? t(lang, "คัดลอกแล้ว ✓", "Copied ✓") : t(lang, "คัดลอก User ID", "Copy User ID")}
    </button>
  );
}
