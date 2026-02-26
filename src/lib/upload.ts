export function sanitizeMetadata(value: string): string {
  const trimmed = value.trim();
  const safe = trimmed.replace(/[^\x20-\x7E]+/g, " ");
  return safe.slice(0, 500);
}

