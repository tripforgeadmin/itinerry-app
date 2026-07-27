"use client";

import { useState } from "react";

/** Member login + consent. On success the API returns the redirect URL
 * (redirect_uri?code=…&state=…) and we navigate the top-level window there. */
export default function AuthorizeForm({
  clientId,
  redirectUri,
  codeChallenge,
  resource,
  state,
}: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  resource: string | null;
  state: string;
}) {
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/oauth/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, passcode, clientId, redirectUri, codeChallenge, resource, state }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.redirect) {
        throw new Error(json.error || "เข้าสู่ระบบไม่สำเร็จ");
      }
      window.location.assign(json.redirect);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none";

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">อีเมล</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} autoComplete="username" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">รหัสผ่านส่วนตัว</label>
        <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} className={input} autoComplete="current-password" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={busy || !email.trim() || !passcode}
        className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40"
      >
        {busy ? "กำลังเชื่อมต่อ…" : "อนุญาตให้เชื่อมต่อ"}
      </button>
    </form>
  );
}
