// lib/scheduler.ts

export type Frequency = "DAILY" | "WEEKLY" | "MID_MONTHLY" | "MID_WEEKLY" | "MONTHLY"

/**
 * Given an anchor time + frequency, return the next run date
 * that is strictly in the future. Preserves the original time-of-day.
 */
export function getNextRunDate(
  anchor: Date,
  frequency: Frequency,
  now: Date = new Date()
): Date {
  let next = new Date(anchor)

  while (next <= now) {
    switch (frequency) {
      case "DAILY":     next.setDate(next.getDate() + 1);          break
      case "WEEKLY":    next.setDate(next.getDate() + 7);          break
      case "MID_MONTHLY":   next.setDate(next.getDate() + 15);        break
      case "MID_WEEKLY":    next.setDate(next.getDate() + 3);          break
      case "MONTHLY":   next.setMonth(next.getMonth() + 1);        break
    }
  }

  return next
}