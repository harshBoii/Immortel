import { Suspense } from "react";
import DataMineContent from "./server";

export default function DataMinePage() {
  return (
    <div className="max-w-5xl mx-auto min-h-[60vh] px-6 pb-6 pt-2">
      <h1 className="text-3xl font-semibold text-foreground font-heading tracking-tight">
        GEO · Data Mine
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Curate the canonical entity, intelligence, and generator configuration used for AEO pages.
      </p>

      <div className="mt-6">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading Data Mine…</div>}>
          <DataMineContent />
        </Suspense>
      </div>
    </div>
  );
}

