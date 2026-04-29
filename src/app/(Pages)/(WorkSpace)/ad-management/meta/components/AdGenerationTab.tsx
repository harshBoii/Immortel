'use client';

import { HeygenAdGenerationCard } from './HeygenAdGenerationCard';
import { HeygenAdGenerationAgentCard } from './HeygenAdGenerationAgentCard';

export function AdGenerationTab() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <HeygenAdGenerationCard />
      <HeygenAdGenerationAgentCard />
    </div>
  );
}

