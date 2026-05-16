import { Feature } from "./check-limit";
import { prisma } from "@/lib/prisma";

export async function incrementUsage(companyId: string, feature: Feature) {
    const fieldMap: Record<Feature, object> = {
      radarScans:        { radarScansUsed:        { increment: 1 } },
      bountyGenerator:   { bountyGeneratorUsed:   { increment: 1 } },
      seoPageGeneration: { seoPageGenerationUsed: { increment: 1 } },
      rivalsAnalysis:    { rivalsAnalysisUsed:    { increment: 1 } },
    };
  
    await prisma.subscriptionUsage.update({
      where:  { companyId },
      data:   fieldMap[feature],
    });
  }