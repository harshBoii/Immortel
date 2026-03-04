import { Suspense } from "react";
import DataMineContent from "./server";

export default function DataMinePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-foreground font-heading">
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

