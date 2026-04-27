import { NextResponse } from "next/server";
import { graphPost } from "@/lib/meta/graph";
import { loadIntegrationForSession } from "@/lib/meta/loadIntegration";
import { prisma } from "@/lib/prisma";
import {
  pollStreamReady,
  streamMp4PlaybackUrl,
  streamToCloudflareStream,
} from "@/lib/cloudfare";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));

  const rows = await prisma.metaMedia.findMany({
    where: { metaIntegrationId: loaded.integrationId, kind: "video" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const loaded = await loadIntegrationForSession();
  if (!loaded) {
    return NextResponse.json({ error: "Meta not connected" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = form.get("file");
  const isBlob =
    file != null &&
    typeof file === "object" &&
    typeof (file as Blob).arrayBuffer === "function";
  if (!isBlob) {
    return NextResponse.json(
      { error: "file is required (multipart field name: file)" },
      { status: 400 },
    );
  }

  const mime = file.type || "application/octet-stream";
  if (!mime.startsWith("video/")) {
    return NextResponse.json({ error: "Expected a video file" }, { status: 400 });
  }

  let upload: Awaited<ReturnType<typeof streamToCloudflareStream>>;
  try {
    upload = await streamToCloudflareStream({
      body: file,
      filename: file.name || "video.mp4",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Cloudflare Stream upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const uid = upload.uid;
  const poll = await pollStreamReady(uid);

  let playbackMp4 =
    (poll.result?.playback as { mp4?: string } | undefined)?.mp4 ??
    (upload.raw.playback as { mp4?: string } | undefined)?.mp4 ??
    streamMp4PlaybackUrl(uid);

  let status: "ready" | "processing" = poll.ready ? "ready" : "processing";
  if (!poll.ready) {
    playbackMp4 = streamMp4PlaybackUrl(uid);
  }

  const durationMs =
    typeof poll.result?.duration === "number"
      ? Math.round((poll.result.duration as number) * 1000)
      : upload.duration != null
        ? Math.round(upload.duration * 1000)
        : null;

  const thumb =
    (typeof poll.result?.thumbnail === "string" && poll.result.thumbnail) ||
    upload.thumbnail ||
    null;

  let videoId: string | null = null;
  if (status === "ready") {
    try {
      const adv = (await graphPost(
        `${loaded.actId}/advideos`,
        { file_url: playbackMp4 },
        { accessToken: loaded.accessToken },
      )) as { id?: string };
      videoId = adv.id ?? null;
    } catch {
      status = "processing";
    }
  }

  const row = await prisma.metaMedia.create({
    data: {
      metaIntegrationId: loaded.integrationId,
      kind: "video",
      videoId,
      videoStreamId: uid,
      videoUrl: playbackMp4,
      thumbnailUrl: thumb,
      filename: file.name || null,
      mimeType: mime,
      bytes: file.size || null,
      durationMs,
      status,
    },
  });

  return NextResponse.json({
    id: row.id,
    videoId: row.videoId,
    videoStreamId: row.videoStreamId,
    videoUrl: row.videoUrl,
    thumbnailUrl: row.thumbnailUrl,
    status: row.status,
  });
}
