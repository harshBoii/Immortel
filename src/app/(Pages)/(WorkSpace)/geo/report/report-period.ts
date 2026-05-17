/** Start of the current week (Sunday 00:00:00 local) through now. */
export function getReportPeriodBounds(now = new Date()): { start: Date; end: Date } {
  const end = new Date(now);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const dayOfWeek = start.getDay(); // 0 = Sunday
  start.setDate(start.getDate() - dayOfWeek);
  return { start, end };
}

export function isWithinReportPeriod(
  value: string | Date | null | undefined,
  bounds: { start: Date; end: Date }
): boolean {
  if (value == null) return false;
  const t = new Date(value).getTime();
  if (!Number.isFinite(t)) return false;
  return t >= bounds.start.getTime() && t <= bounds.end.getTime();
}

export function formatReportPeriodLabel(bounds: { start: Date; end: Date }): string {
  const opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" };
  const startLabel = bounds.start.toLocaleDateString(undefined, opts);
  const endLabel = bounds.end.toLocaleDateString(undefined, opts);
  return `${startLabel} – ${endLabel}`;
}
