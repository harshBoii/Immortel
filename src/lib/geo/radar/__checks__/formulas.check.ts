import assert from "node:assert/strict";
import { computeBountyEstimatedRevenue, bountyPriorityScore } from "../bountyRevenue";
import { medianCompanyAovFromProducts, parseMoney } from "../shopifyAov";
import { wrsWeightForRank, businessFitScore, rankFactor } from "../scoring";

assert.equal(parseMoney("12.99"), 12.99);
assert.equal(parseMoney(null), null);

const med = medianCompanyAovFromProducts(
  [
    { priceMinAmount: "10", priceMaxAmount: "20" },
    { priceMinAmount: "20", priceMaxAmount: "20" },
    { priceMinAmount: "30", priceMaxAmount: "30" },
  ],
  99
);
assert.equal(med, 20);

const rev = computeBountyEstimatedRevenue({
  estimatedReach: 1000,
  conversionRate: 0.025,
  avgOrderValue: 80,
});
assert.equal(rev, 2000);

assert.ok(bountyPriorityScore({ estimatedReach: 400, confidence: 2, difficulty: "EASY" }) > 0);

assert.equal(wrsWeightForRank(1), 1);
assert.equal(wrsWeightForRank(2), 0.5);
assert.ok(Math.abs(wrsWeightForRank(3) - 0.33) < 0.01);

assert.ok(businessFitScore("best crm for plumbers", ["CRM"], ["sales"], []) > 0.2);
assert.equal(rankFactor(2, true), 0.2);
assert.equal(rankFactor(null, false), 1);

console.log("radar formula checks ok");
