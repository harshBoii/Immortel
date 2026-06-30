import type { OfferingType } from "@prisma/client";

const VALID_OFFERING_TYPES: OfferingType[] = [
  "PRODUCT",
  "SERVICE",
  "FEATURE",
  "INTEGRATION",
  "PLAN",
];

/** Map enrichment / LLM offering labels to a valid Prisma OfferingType. */
export function normalizeOfferingType(raw: string | null | undefined): OfferingType {
  const upper = raw?.trim().toUpperCase();
  if (upper && (VALID_OFFERING_TYPES as string[]).includes(upper)) {
    return upper as OfferingType;
  }
  if (upper === "OTHER") return "SERVICE";
  return "PRODUCT";
}
