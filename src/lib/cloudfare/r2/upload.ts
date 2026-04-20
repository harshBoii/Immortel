import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { r2 } from "@/lib/r2";

export type StreamBody =
  | Readable
  | WebReadableStream
  | Blob
  | Buffer
  | Uint8Array;

function normalizeBody(body: StreamBody) {
  if (body instanceof Readable) return body;
  if (body instanceof Buffer || body instanceof Uint8Array) return body;
  if (typeof Blob !== "undefined" && body instanceof Blob) return body;
  return Readable.fromWeb(body as WebReadableStream);
}

export async function streamToR2(opts: {
  body: StreamBody;
  key: string;
  contentType: string;
  bucket: string;
}): Promise<{ key: string }> {
  const body = normalizeBody(opts.body);
  const upload = new Upload({
    client: r2,
    params: {
      Bucket: opts.bucket,
      Key: opts.key,
      Body: body,
      ContentType: opts.contentType,
    },
    queueSize: 4,
    partSize: 5 * 1024 * 1024,
    leavePartsOnError: false,
  });
  await upload.done();
  return { key: opts.key };
}
