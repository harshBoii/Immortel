/** Strip characters and lengths that can break @react-pdf text/layout. */
export function sanitizePdfText(value: unknown, maxLen = 2000): string {
  if (value == null) return "";
  const s = String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}…`;
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0 || items.length === 0) return items.length === 0 ? [] : [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
