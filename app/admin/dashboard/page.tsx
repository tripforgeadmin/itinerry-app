import { fetchDashboardData } from "@/lib/dashboard-data";
import DashboardView from "./DashboardView";

export const dynamic = "force-dynamic";

// Analytics dashboard — auto-protected by proxy.ts (the /admin/* matcher). Fetches live data
// server-side and hands it to the client engine.
export default async function DashboardPage() {
  const data = await fetchDashboardData();
  return <DashboardView data={data} />;
}
