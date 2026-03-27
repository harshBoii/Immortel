import { OverviewDashboard } from "@/app/components/home/OverviewDashboard";
import { getSession } from "@/lib/auth";
import { getHomeOverviewStats } from "@/lib/home/getHomeOverviewStats";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSession();
  if (!session?.companyId) redirect("/login");

  const snapshot = await getHomeOverviewStats(session.companyId);

  return <OverviewDashboard snapshot={snapshot} />;
}
