import { Suspense } from "react";
import RadarContent from "./server";
import RadarRefreshButton from "./refresh-button";
import LoadingAnimation from "@/app/components/animations/loading";

export default function RadarPage() {
  return (
    <div className="max-w-5xl mx-auto min-h-[60vh] px-6 pb-6 pt-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground font-heading tracking-tight">
            GEO · Company Radar
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
