"use client";

import { useState } from "react";
import {
  BountyHeader,
  BountyFilterTabs,
  BountyTable,
  type BountyFilterTab,
  type BountyNiche,
} from "@/app/components/geo/bounty";

type BountyViewProps = {
  initialNiches: BountyNiche[];
  summary: {
    total_niches: number;
    total_prompts: number;
    by_difficulty: { easy: number; medium: number; hard: number };
  } | null;
};

export function BountyView({ initialNiches, summary }: BountyViewProps) {
  const [filter, setFilter] = useState<BountyFilterTab>("all");

  const counts = summary
    ? {
        all: summary.total_niches,
        easy: summary.by_difficulty.easy,
        medium: summary.by_difficulty.medium,
        hard: summary.by_difficulty.hard,
      }
    : {
        all: initialNiches.length,
        easy: initialNiches.filter((n) => n.difficulty.toLowerCase() === "easy").length,
        medium: initialNiches.filter((n) => n.difficulty.toLowerCase() === "medium").length,
        hard: initialNiches.filter((n) => n.difficulty.toLowerCase() === "hard").length,
      };

  return (
    <div className="space-y-6">
      <BountyHeader />
      <BountyFilterTabs
        activeTab={filter}
        onTabChange={setFilter}
        counts={counts}
      />
      <BountyTable niches={initialNiches} filter={filter} />
    </div>
  );
}
