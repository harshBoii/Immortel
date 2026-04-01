import { NextResponse } from "next/server";
import { Agent } from "undici";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { applyRadarOutput, parseRadarMicroservicePayload } from "@/lib/geo/radar/applyRadarOutput";
import { buildRadarGetPayload } from "@/lib/geo/radar/buildRadarGetPayload";

const radarDispatcher = new Agent({
  // Default undici header timeout can be too aggressive for slow LLM workflows.
  headersTimeout: 420_000, // 7 min
  bodyTimeout: 600_000, // 10 min
});

async function fetchRadarWithRetry(url: string, init: RequestInit, retries = 2) {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, {
        ...(init as any),
        dispatcher: radarDispatcher,
      } as RequestInit);
    } catch (err) {
      lastErr = err;
      const code = (err as any)?.cause?.code ?? (err as any)?.code;
      const isHeaderTimeout = code === "UND_ERR_HEADERS_TIMEOUT";
      const isFetchFailed = String((err as any)?.message ?? "").includes("fetch failed");
      if (attempt >= retries || (!isHeaderTimeout && !isFetchFailed)) throw err;
      const backoffMs = 750 * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastErr;
}

type RadarInput = {
  company: { name: string; website: string; linkedin: string; about?: string };
  brandEntity: {
    category: string;
    topics: string[];
    keywords: string[];
    offerings?: Array<{
      product?: string;
      productType?: string;
      url?: string;
      differentiators: string[];
      useCases: string[];
      targetAudiences: string[];
      competitorGroups: string[];
    }>;
  };
  competitors: string[];
  models: string[];
  llmTopics?: string[];
};

export async function POST() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const companyId = session.companyId;

  const [company, brandEntity, geoDataSources, llmTopics, shopifyProducts, rivals] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, website: true, description: true },
    }),
    prisma.brandEntity.findUnique({
      where: { companyId },
      include: {
        sameAsLinks: true,
        offerings: true,
      },
    }),
    prisma.geoDataSource.findMany({
      where: {
        companyId,
        sourceType: "URL",
        label: { in: ["LinkedIn", "Website URL"] },
        isActive: true,
      },
      select: { label: true, rawContent: true },
    }),
    prisma.llmTopic.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        prompts: {
          where: { isActive: true },
          select: { query: true },
        },
      },
    }),
    prisma.shopifyProduct.findMany({
      where: { companyId },
      orderBy: { shopifyUpdatedAt: "desc" },
      select: {
        title: true,
        onlineStoreUrl: true,
      },
    }),
    prisma.companyRival.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      select: {
        rivalCompany: {
          select: { name: true },
        },
      },
    }),
  ]);

  if (!company) {
    return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
  }

  const website =
    company.website ??
    geoDataSources.find((s) => s.label === "Website URL")?.rawContent?.trim() ??
    "";
  const linkedin =
    brandEntity?.sameAsLinks.find((l) =>
      l.platform.toLowerCase().includes("linkedin")
    )?.url ??
    geoDataSources.find((s) => s.label === "LinkedIn")?.rawContent?.trim() ??
    "";

  const primaryOffering =
    brandEntity?.offerings.find((o) => o.isPrimary) ?? brandEntity?.offerings[0];
  const competitorsFromOffering = primaryOffering?.competitors ?? [];
  const competitorsFromRivals = rivals.map((r) => r.rivalCompany.name).filter(Boolean);
  const competitors = (() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const name of [...competitorsFromRivals, ...competitorsFromOffering]) {
      const n = (name ?? "").trim();
      if (!n) continue;
      const key = n.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(n);
    }
    return out;
  })();
  const topics = brandEntity?.topics ?? [];
  const keywords = brandEntity?.keywords ?? [];
  const category = brandEntity?.category ?? "";

  const brandOfferings =
    brandEntity?.offerings.map((o) => ({
      product: o.name ?? undefined,
      productType: o.offeringType ?? undefined,
      url: o.url ?? undefined,
      differentiators: o.differentiators ?? [],
      useCases: o.useCases ?? [],
      targetAudiences: o.targetAudiences ?? [],
      competitorGroups: o.competitors ?? [],
    })) ?? [];

  const shopifyOfferings = shopifyProducts
    .filter((p) => Boolean(p.title?.trim()))
    .map((p) => ({
      product: p.title.trim(),
      productType: "PRODUCT",
      url: p.onlineStoreUrl ?? undefined,
      differentiators: [] as string[],
      useCases: [] as string[],
      targetAudiences: [] as string[],
      competitorGroups: [] as string[],
    }));

  const offerings = [...brandOfferings, ...shopifyOfferings];

  const input: RadarInput = {
    company: {
      name: company.name,
      website: website || "https://example.com",
      linkedin: linkedin || "https://linkedin.com",
      about: brandEntity?.about ?? company.description ?? undefined,
    },
    brandEntity: {
      category,
      topics,
      keywords,
      ...(offerings.length > 0 ? { offerings } : {}),
    },
    competitors,
    models: ["gpt-4o", "claude-3.5", "gemini-1.5"],
    ...(llmTopics.length > 0
      ? {
          llmTopics: llmTopics.map((t) => t.name),
        }
      : {}),
  };

  const base = process.env.MICROSERVICE_URL;
  if (!base) {
    return NextResponse.json(
      { success: false, error: "MICROSERVICE_URL is not configured" },
      { status: 500 }
    );
  }

  const radarUrl = `${base.replace(/\/$/, "")}/company/radar`;
  let payload: unknown;

  try {
    const requestPayload = {
      ...input,
      session_id: `company-radar-${companyId}`,
    };


    // console.log(
    //     "[geo/radar] POST /company/radar payload:",
    //     JSON.stringify(requestPayload, null, 2)
    //   );


    const res = await fetchRadarWithRetry(radarUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...requestPayload,
      }),
    });


    
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          error: "Radar microservice failed",
          status: res.status,
          body: text || undefined,
        },
        { status: 502 }
      );
    }

    payload = await res.json();
  } catch (err) {
    console.error("Radar microservice error:", err);
    return NextResponse.json(
      { success: false, error: "Error contacting radar service" },
      { status: 502 }
    );
  }

  const radarOutput = parseRadarMicroservicePayload(payload);
  if (!radarOutput) {
    return NextResponse.json(
      { success: false, error: "Invalid radar response" },
      { status: 502 }
    );
  }

  const { normalizedMetrics } = await applyRadarOutput(prisma, company, radarOutput);

  return NextResponse.json({
    success: true,
    input,
    output: {
      topics: radarOutput.topics,
      prompts: radarOutput.prompts,
      citations: radarOutput.citations,
      metrics: normalizedMetrics,
    },
  });
}

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const companyId = session.companyId;
  const payload = await buildRadarGetPayload(prisma, companyId);

  return NextResponse.json({
    success: true,
    ...payload,
    metrics: payload.metrics.map((m) => ({
      ...m,
      share_of_voice: m.shareOfVoice,
      top3_rate: m.top3Rate,
      query_coverage: m.queryCoverage,
      competitor_rank: m.competitorRank,
      topic_authority: m.topicAuthority,
    })),
    latest: payload.latest
      ? {
          ...payload.latest,
          share_of_voice: payload.latest.shareOfVoice,
          top3_rate: payload.latest.top3Rate,
          query_coverage: payload.latest.queryCoverage,
          competitor_rank: payload.latest.competitorRank,
          topic_authority: payload.latest.topicAuthority,
        }
      : null,
  });
}
