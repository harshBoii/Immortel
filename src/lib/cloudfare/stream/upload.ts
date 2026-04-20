import { cfStreamJson, streamAccountPath } from "./client";

export type StreamUploadResult = {
  uid: string;
  readyToStream: boolean;
  playback?: { hls?: string; dash?: string };
  thumbnail?: string;
  duration?: number;
  raw: Record<string, unknown>;
};

// TODO: tus-large-file upload for assets > 200 MB (Cloudflare Stream TUS endpoint).

/** Basic upload (≤ ~200 MB). Multipart upload to Cloudflare Stream. */
export async function streamToCloudflareStream(opts: {
  body: Blob | File;
  filename: string;
  metadata?: Record<string, string>;
}): Promise<StreamUploadResult> {
  const form = new FormData();
  form.append("file", opts.body, opts.filename);
  if (opts.metadata) {
    form.append("meta", JSON.stringify(opts.metadata));
  }

  const path = streamAccountPath("/stream");
  const envelope = await cfStreamJson<Record<string, unknown>>(path, {
    method: "POST",
    body: form,
  });

  const result = (envelope.result ?? {}) as Record<string, unknown> & {
    uid?: string;
    readyToStream?: boolean;
    thumbnail?: string;
    duration?: number;
    playback?: { hls?: string; dash?: string };
  };

  const uid = typeof result.uid === "string" ? result.uid : "";
  if (!uid) {
    throw new Error("Cloudflare Stream upload returned no uid");
  }

  return {
    uid,
    readyToStream: Boolean(result.readyToStream),
    playback: result.playback,
    thumbnail: typeof result.thumbnail === "string" ? result.thumbnail : undefined,
    duration: typeof result.duration === "number" ? result.duration : undefined,
    raw: result,
  };
}

/** Poll Stream until readyToStream or attempts exhausted. */
export async function pollStreamReady(uid: string, opts?: {
  maxAttempts?: number;
  delayMs?: number;
}): Promise<{ ready: boolean; result: Record<string, unknown> }> {
  const maxAttempts = opts?.maxAttempts ?? 15;
  const delayMs = opts?.delayMs ?? 2000;
  const path = streamAccountPath(`/stream/${uid}`);

  for (let i = 0; i < maxAttempts; i++) {
    const envelope = await cfStreamJson<Record<string, unknown>>(path, {
      method: "GET",
    });
    const result = (envelope.result ?? {}) as Record<string, unknown> & {
      readyToStream?: boolean;
      status?: { state?: string } | string;
    };

    if (result.readyToStream === true) {
      return { ready: true, result: result as Record<string, unknown> };
    }

    const st = result.status;
    const state =
      typeof st === "object" && st && "state" in st
        ? (st as { state?: string }).state
        : typeof st === "string"
          ? st
          : undefined;
    if (state === "error") {
      return { ready: false, result: result as Record<string, unknown> };
    }

    await new Promise((r) => setTimeout(r, delayMs));
  }

  return { ready: false, result: {} };
}
