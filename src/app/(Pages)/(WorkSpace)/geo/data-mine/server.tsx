import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import DataMinePageClient from "./ui";

export default async function DataMineContent() {
  const session = await getSession();
  const companyId = session?.companyId ?? null;

  if (!companyId) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--glass-border)] bg-[var(--glass)] p-6 text-sm text-muted-foreground">
        You&apos;re not associated with a company yet. Sign in as a company user to manage GEO data.
      </div>
    );
  }

  const sources = await prisma.geoDataSource.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: {
      asset: {
        select: {
          id: true,
          assetType: true,
          title: true,
          filename: true,
          status: true,
          thumbnailUrl: true,
          playbackUrl: true,
          duration: true,
          resolution: true,
          createdAt: true,
        },
      },
    },
  });

  const serialized = sources.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    asset: s.asset
      ? { ...s.asset, createdAt: s.asset.createdAt.toISOString() }
      : null,
  }));

  return <DataMinePageClient initialSources={serialized} />;
}

