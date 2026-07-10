"use client";

import { useRouter } from "next/navigation";
import { LangToggle } from "@/components/ui/LangToggle";
import { ADMIN_LANG_COOKIE, type Lang } from "@/lib/i18n";

// Writes the admin_lang cookie and refreshes so the server components re-render in the new
// language. Reuses the customer flow's stateless LangToggle pill.
export default function AdminLangToggle({ lang }: { lang: Lang }) {
  const router = useRouter();
  function change(l: Lang) {
    document.cookie = `${ADMIN_LANG_COOKIE}=${l};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    router.refresh();
  }
  return <LangToggle lang={lang} onLangChange={change} />;
}
