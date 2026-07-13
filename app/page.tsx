import { redirect } from "next/navigation";

// Forward the incoming query string (utm_source/utm_medium/utm_campaign, the LINE
// share cards' ?ref=line-share, etc.) rather than dropping it — GA4/GTM (loaded in
// the root layout) only auto-detect campaign params from the URL of the page that
// actually renders, so a bare redirect("/auth") was silently discarding them before
// any tracking script got a chance to see them.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
  }
  const qs = params.toString();
  redirect(qs ? `/auth?${qs}` : "/auth");
}
