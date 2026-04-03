// import { OverviewDashboard } from "@/app/components/home/OverviewDashboard";
// import { getSession } from "@/lib/auth";
// import { getHomeOverviewStats } from "@/lib/home/getHomeOverviewStats";
// import { redirect } from "next/navigation";

// export default async function Home() {
//   const session = await getSession();
//   if (!session?.companyId) redirect("/login");

//   const snapshot = await getHomeOverviewStats(session.companyId);

//   return <OverviewDashboard snapshot={snapshot} />;
// }

import { Suspense } from "react";
import RadarContent from "./geo/radar/server";
import RadarRefreshButton from "./geo/radar/refresh-button";
import LoadingAnimation from "@/app/components/animations/loading";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";


export default async function HomePage() {
  const session = await getSession();
  if (!session?.companyId) redirect("/login");

  return (
    <div className="max-w-5xl mx-auto min-h-[60vh] px-6 pb-6 pt-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground font-heading tracking-tight">
            Home
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            LLM citation visibility across prompts and models. Refresh to fetch latest from the radar microservice.
          </p>
        </div>
        <RadarRefreshButton />
      </div>

      <div className="mt-6">
        <Suspense fallback={<LoadingAnimation text={`Dammn ! That's Heavy... So much data to process !...`} />}>
          <RadarContent />
        </Suspense>
      </div>
    </div>
  );
}
