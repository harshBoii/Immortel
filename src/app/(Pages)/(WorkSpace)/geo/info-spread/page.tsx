import { Suspense } from "react";
import InfoSpreadContent from "./server";
import LoadingAnimation from "@/app/components/animations/loading";

export default function InfoSpreadPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-foreground font-heading">
        GEO · Info Spread
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        See how your GEO entity is currently represented across generated AEO pages and citation bounties.
      </p>

      <div className="mt-6">
        <Suspense fallback={<LoadingAnimation text={`Fetching Your Records From The Cloud...`} />}>
          <InfoSpreadContent />
        </Suspense>
      </div>
    </div>
  );
}

