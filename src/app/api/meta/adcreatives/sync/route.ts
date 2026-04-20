import { NextResponse } from "next/server";
import { graphGet } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { prisma } from "@/lib/prisma";

type LinkData = {
  name?: string;
  message?: string;
  link?: string;
  description?: string;
};

type StorySpec = {
  link_data?: LinkData;
};

function fromSpec(spec: unknown): { headline: string; primary: string; url: string; description: string | null } {
  const s = spec as StorySpec | null;
  const ld = s?.link_data;
  return {
    headline: (ld?.name ?? "Synced creative").slice(0, 500),
    primary: ld?.message ?? "",
    url: ld?.link && /^https?:\/\//i.test(ld.link) ? ld.link : "https://example.com",
    description: ld?.description ?? null,
  };
}

type CrRow = {
  id?: string;
  name?: string;
  object_story_spec?: unknown;
};

export async function POST() {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const fields = "id,name,object_story_spec";
  const rows: CrRow[] = [];
  let after: string | undefined;

  try {
    for (;;) {
      const params: Record<string, string | number | boolean | undefined> = {
        fields,
        limit: 100,
      };
      if (after) params.after = after;

      const page = (await graphGet(`${loaded.actId}/adcreatives`, params, {
        accessToken: loaded.accessToken,
      })) as {
        data?: CrRow[];
        paging?: { cursors?: { after?: string } };
      };

      const chunk = page.data ?? [];
      rows.push(...chunk);
      after = page.paging?.cursors?.after;
      if (!after || chunk.length === 0) break;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let synced = 0;
  for (const c of rows) {
    if (!c.id) continue;
    const parsed = fromSpec(c.object_story_spec);

    await prisma.metaCreative.upsert({
      where: {
        metaIntegrationId_metaCreativeId: {
          metaIntegrationId: loaded.integrationId,
          metaCreativeId: c.id,
        },
      },
      create: {
        metaIntegrationId: loaded.integrationId,
        metaCampaignId: null,
        metaCreativeId: c.id,
        imageHash: null,
        headline: parsed.headline,
        primaryText: parsed.primary,
        description: parsed.description,
        ctaType: "LEARN_MORE",
        landingUrl: parsed.url,
        aiGenerated: false,
      },
      update: {
        headline: parsed.headline,
        primaryText: parsed.primary,
        description: parsed.description,
        landingUrl: parsed.url,
      },
    });
    synced += 1;
  }

  return NextResponse.json({ ok: true, synced });
}
