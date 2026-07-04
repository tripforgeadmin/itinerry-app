"use client";

import { useState } from "react";

export default function CopyLineIdButton({ userId }: { userId: string | null }) {
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
      {copied ? "คัดลอกแล้ว ✓" : "คัดลอก User ID"}
    </button>
  );
}
