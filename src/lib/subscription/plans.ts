// lib/subscription/plans.ts
export const PLAN_CONFIG = {
    STARTER: {
      priceAmount: 4900, // $49.00
      radarScansQuota: 40,
      bountyGeneratorQuota: 30,
      seoPageGenerationQuota: 20,
      rivalsAnalysisQuota: 10,
    },
    GROWTH: {
      priceAmount: 14900, // $149.00
      radarScansQuota: 150,
      bountyGeneratorQuota: 80,
      seoPageGenerationQuota: 60,
      rivalsAnalysisQuota: 20,
    },
    SCALE: {
      priceAmount: 49900, // $499.00
      radarScansQuota: 500,
      bountyGeneratorQuota: 300,
      seoPageGenerationQuota: 200,
      rivalsAnalysisQuota: 50,
    },
  } as const;
  
  export const ADD_ON_CONFIG = {
    AEO_CONTENT_BOOST: { priceAmount: 2900 },         // $29/mo
    ALTERNATE_DAY_AUTOMATION: { priceAmount: 1900 },   // $19/mo — Growth only
    EXTRA_RIVALS_PACK: { priceAmount: 2500 },          // $25/mo — +10 rivals runs
  } as const;