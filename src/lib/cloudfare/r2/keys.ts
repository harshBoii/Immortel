import { randomUUID } from "crypto";

function safeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
  return base.length > 0 ? base : "upload";
}

/** R2 object key: meta/{companyId}/images/{uuid}-{safeName} */
export function metaImageKey(companyId: string, filename: string): string {
  return `meta/${companyId}/images/${randomUUID()}-${safeFilename(filename)}`;
}
