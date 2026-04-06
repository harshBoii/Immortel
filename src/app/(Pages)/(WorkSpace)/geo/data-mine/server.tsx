"use client";

import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import DataMinePageClient from "./ui";
import LoadingAnimation from "@/app/components/animations/loading";

type DmProps = ComponentProps<typeof DataMinePageClient>;

type ApiOk = {
  success: true;
  sources: DmProps["initialSources"];
  company: DmProps["initialCompany"];
  brandEntity: DmProps["initialBrandEntity"];
  offerings: DmProps["initialOfferings"];
  branding: DmProps["initialBranding"];
};

export default function DataMineContent() {
  const [loading, setLoading] = useState(true);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<ApiOk | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/geo/data-mine", { credentials: "include" });
        const json = (await res.json()) as
          | ApiOk
          | { success: false; error?: string };
        if (cancelled) return;
        if (res.status === 401) {
          setUnauthenticated(true);
          return;
        }
        if (!res.ok || !("success" in json) || !json.success) {
          setLoadError("error" in json && json.error ? json.error : "Failed to load data mine");
          return;
        }
        setData(json);
      } catch {
        if (!cancelled) setLoadError("Failed to load data mine");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <LoadingAnimation text={`Pheww ! That's Heavy... Gimme some waterrrr !...`} />
    );
  }

  if (unauthenticated) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--glass-border)] bg-[var(--glass)] p-6 text-sm text-muted-foreground">
        You&apos;re not associated with a company yet. Sign in as a company user to manage GEO data.
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--glass-border)] bg-[var(--glass)] p-6 text-sm text-muted-foreground">
        {loadError ?? "Something went wrong."}
      </div>
    );
  }

  return (
    <DataMinePageClient
      initialSources={data.sources}
      initialCompany={data.company}
      initialBrandEntity={data.brandEntity}
      initialOfferings={data.offerings}
      initialBranding={data.branding}
    />
  );
}
