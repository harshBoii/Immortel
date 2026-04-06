import { Suspense } from "react";
import HqDashboardClient from "./HqDashboardClient";

export default function HeadquartersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-muted-foreground text-sm">Loading headquarters…</div>
      }
    >
      <HqDashboardClient />
    </Suspense>
  );
}
