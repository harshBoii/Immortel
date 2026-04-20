import { NextResponse } from "next/server";

import { graphGet } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { hydrateImageHashes, hydrateVideoIds } from "@/lib/meta/mediaSync";

export const runtime = "nodejs";
export const maxDuration = 300;

type AdImageListRow = {
  hash?: string;
  permalink_url?: string;
  width?: number;
  height?: number;
  name?: string;
};

type AdVideoListRow = {
  id?: string;
  source?: string;
  picture?: string;
  title?: string;
};

async function paginate<T>(
  path: string,
  fields: string,
  accessToken: string,
): Promise<T[]> {
  const out: T[] = [];
  let after: string | undefined;
  for (;;) {
    const params: Record<string, string | number | boolean | undefined> = {
      fields,
      limit: 100,
    };
    if (after) params.after = after;
    const page = (await graphGet(path, params, { accessToken })) as {
      data?: T[];
      paging?: { cursors?: { after?: string } };
    };
    const chunk = page.data ?? [];
    out.push(...chunk);
    after = page.paging?.cursors?.after;
    if (!after || chunk.length === 0) break;
  }
  return out;
}

export async function POST() {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  let images: AdImageListRow[] = [];
  let videos: AdVideoListRow[] = [];

  try {
    images = await paginate<AdImageListRow>(
      `${loaded.actId}/adimages`,
      "hash,permalink_url,width,height,name",
      loaded.accessToken,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "adimages list failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  try {
    videos = await paginate<AdVideoListRow>(
      `${loaded.actId}/advideos`,
      "id,source,picture,title",
      loaded.accessToken,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "advideos list failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const hashes = images
    .map((r) => r.hash)
    .filter((h): h is string => typeof h === "string" && h.length > 0);
  const videoIds = videos
    .map((r) => r.id)
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  const imageResult = await hydrateImageHashes(hashes, loaded);
  const videoResult = await hydrateVideoIds(videoIds, loaded);

  return NextResponse.json({
    ok: true,
    images: {
      seen: hashes.length,
      inserted: imageResult.inserted,
      skipped: imageResult.skipped,
    },
    videos: {
      seen: videoIds.length,
      inserted: videoResult.inserted,
      skipped: videoResult.skipped,
    },
  });
}
