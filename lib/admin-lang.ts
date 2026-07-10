import { cookies } from "next/headers";
import { ADMIN_LANG_COOKIE, type Lang } from "@/lib/i18n";

// Server-only: read the admin's language choice from the request cookie. All admin pages are
// force-dynamic server components, so this is free. Defaults to Thai.
export async function getAdminLang(): Promise<Lang> {
  const c = await cookies();
  return c.get(ADMIN_LANG_COOKIE)?.value === "en" ? "en" : "th";
}
