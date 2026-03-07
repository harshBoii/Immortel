import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import type { Difficulty } from "@prisma/client";

type BountyRequest = {
  company: { name: string; website: string; linkedin: string };
  brandEntity: {
    category: string;
    topics: string[];
    keywords: string[];
  };
  competitors: string[];
  models: string[];
  session_id: string;
};

type BountyNiche = {
  topic: string;
  description: string;
  difficulty: string;
  prompts: string[];
  prompt_count: number;
};

type BountyResponse = {
  niches: BountyNiche[];
  summary?: {
    total_niches: number;
    total_prompts: number;
    by_difficulty: { easy: number; medium: number; hard: number };
  };
};

function mapDifficulty(s: string): Difficulty {
  const lower = (s ?? "").toLowerCase();
  if (lower === "easy") return "EASY";
  if (lower === "hard") return "HARD";
  return "MEDIUM";
}

export async function POST() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const companyId = session.companyId;

  const [company, brandEntity] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, website: true },
    }),
    prisma.brandEntity.findUnique({
      where: { companyId },
      include: {
        sameAsLinks: true,
        offerings: { where: { isActive: true }, take: 5 },
      },
    }),
  ]);

  if (!company) {
    return NextResponse.json({ success: false, error: "Company not found" }, { status: 404 });
  }

  const linkedin =
    brandEntity?.sameAsLinks.find((l) =>
      l.platform.toLowerCase().includes("linkedin")
    )?.url ?? "";
  const primaryOffering =
    brandEntity?.offerings?.find((o) => o.isPrimary) ?? brandEntity?.offerings?.[0];
  const competitors = primaryOffering?.competitors ?? [];
  const topics = brandEntity?.topics ?? [];
  const keywords = brandEntity?.keywords ?? [];
  const category = brandEntity?.category ?? "";

  const body: BountyRequest = {
    company: {
      name: company.name,
      website: company.website ?? "https://example.com",
      linkedin: linkedin || "https://linkedin.com",
    },
    brandEntity: {
      category,
      topics,
      keywords,
    },
    competitors,
    models: ["gpt-4o"],
    session_id: `bounty-${companyId}-${Date.now()}`,
  };

  const base = process.env.MICROSERVICE_URL;
  if (!base) {
    return NextResponse.json(
      { success: false, error: "MICROSERVICE_URL is not configured" },
      { status: 500 }
    );
  }

  const bountyUrl = `${base.replace(/\/$/, "")}/company/bounty`;
  let data: BountyResponse;

  try {
    const res = await fetch(bountyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          error: "Bounty microservice failed",
          status: res.status,
          body: text || undefined,
        },
        { status: 502 }
      );
    }

    const raw = await res.json();
    data = raw?.niches ? raw : (raw?.output ?? raw);
  } catch (err) {
    console.error("Bounty microservice error:", err);
    return NextResponse.json(
      { success: false, error: "Error contacting bounty service" },
      { status: 502 }
    );
  }

  if (!data?.niches?.length) {
    return NextResponse.json({
      success: true,
      niches: [],
      summary: data?.summary ?? null,
    });
  }

  for (const niche of data.niches) {
    const topicName = niche.topic?.trim();
    if (!topicName) continue;

    const difficulty = mapDifficulty(niche.difficulty);

    const llmTopic = await prisma.llmTopic.upsert({
      where: { name: topicName },
      create: {
        name: topicName,
        description: niche.description ?? null,
        difficulty,
      },
      update: {
        description: niche.description ?? undefined,
        difficulty,
      },
      select: { id: true },
    });

    const existingPrompts = await prisma.prompt.findMany({
      where: { topicId: llmTopic.id },
      select: { query: true },
    });
    const existingSet = new Set(existingPrompts.map((p) => p.query));

    for (const query of niche.prompts ?? []) {
      const q = query?.trim();
      if (!q || existingSet.has(q)) continue;

      await prisma.prompt.create({
        data: {
          query: q,
          topic: topicName,
          topicId: llmTopic.id,
          isActive: true,
        },
      });
      existingSet.add(q);
    }
  }

  return NextResponse.json({
    success: true,
    niches: data.niches,
    summary: data.summary ?? null,
  });
}

export async function GET() {
  const session = await getSession();
  if (!session?.companyId) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const topics = await prisma.llmTopic.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      prompts: {
        where: { isActive: true },
        select: { id: true, query: true },
      },
    },
  });

  const niches = topics.map((t) => ({
    id: t.id,
    topic: t.name,
    description: t.description ?? "",
    difficulty: t.difficulty,
    prompts: t.prompts.map((p) => ({ id: p.id, query: p.query })),
    prompt_count: t.prompts.length,
  }));

  const byDifficulty = { easy: 0, medium: 0, hard: 0 };
  for (const n of niches) {
    const k = n.difficulty.toLowerCase();
    if (k in byDifficulty) (byDifficulty as Record<string, number>)[k]++;
  }

  return NextResponse.json({
    success: true,
    niches,
    summary: {
      total_niches: niches.length,
      total_prompts: niches.reduce((s, n) => s + n.prompt_count, 0),
      by_difficulty: byDifficulty,
    },
  });
}
