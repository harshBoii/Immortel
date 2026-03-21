'use client';

import { useState } from 'react';
import { SiGoogle, SiOpenai, SiPerplexity } from 'react-icons/si';

const MCP_LINK = 'https://immortel.vercel.app/api/mcpServer';

const PLATFORM_ICONS = {
  chatgpt: SiOpenai,
  perplexity: SiPerplexity,
  claude: SiGoogle,
} as const;

type Platform = 'chatgpt' | 'perplexity' | 'claude';

const INSTRUCTIONS: Record<
  Platform,
  { title: string; steps: string[] }
> = {
  chatgpt: {
    title: 'Connect with ChatGPT',
    steps: [
      'Go to App store',
      'Search The App',
      'Open and Connect To The App',
      'Tag The app and type the prompt',
      'See In Action',
    ],
  },
  perplexity: {
    title: 'Connect with Perplexity',
    steps: [
      'Go To Settings → Connector',
      'Tap On Custom Connector',
      `Enter the link "${MCP_LINK}" in MCP Server Url , any desired name and Select Auth to None`,
      'Connect To The Connector by tapping on the plus icon then search for the connector with the name you Saved and Click On Tickbox Corresponding to the Connector',
      'Type Your Query and See in action',
    ],
  },
  claude: {
    title: 'Connect with Claude',
    steps: [
      'Tap on "Connect Your Tool to Claude"',
      'Tap on Manage Connectors',
      'Tap on the Plus Icon → Add Custom Connector',
      `Enter any name and enter the link ${MCP_LINK}`,
      'Type the query and see in action',
    ],
  },
};

const StepImage = ({
  platform,
  stepNum,
}: {
  platform: Platform;
  stepNum: number;
}) => {
  const folder =
    platform === 'chatgpt' ? 'ChatGpt' : platform === 'perplexity' ? 'Perplexity' : 'Claude';
  const src = `/MCP_Tutorial/${folder}/Step-${stepNum}.png`;
  return (
    <img
      src={src}
      alt={`Step ${stepNum} screenshot`}
      className="aspect-video w-full rounded-lg object-contain bg-[var(--glass-hover)]"
    />
  );
};

export default function MCPPage() {
  const [platform, setPlatform] = useState<Platform>('chatgpt');
  const [stepIndex, setStepIndex] = useState(0);
  const { title, steps } = INSTRUCTIONS[platform];

  const goPrev = () => setStepIndex((i) => Math.max(0, i - 1));
  const goNext = () => setStepIndex((i) => Math.min(steps.length - 1, i + 1));

  return (
    <div className="max-w-4xl mx-auto min-h-[60vh] px-6 pb-6 pt-2">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground font-heading tracking-tight">
          MCP
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Connect Immortel to AI assistants via the Model Context Protocol. Choose your platform below and follow the steps to get started.
        </p>
      </div>

      {/* Platform switcher */}
      <div className="flex flex-wrap gap-2 mb-8">
        {(['chatgpt', 'perplexity', 'claude'] as const).map((p) => {
          const Icon = PLATFORM_ICONS[p];
          return (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPlatform(p);
                setStepIndex(0);
              }}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${platform === p
                  ? 'glass-button text-[var(--sibling-primary)] border-[var(--sibling-primary)]/40'
                  : 'glass-button text-muted-foreground hover:text-foreground'
                }
              `}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {p === 'chatgpt' ? 'ChatGPT' : p === 'perplexity' ? 'Perplexity' : 'Claude'}
            </button>
          );
        })}
      </div>

      {/* Instruction panel - horizontal scroll with prev/next */}
      <div className="glass-card card-anime-float rounded-xl p-6">
        <h2 className="text-xl font-semibold text-foreground font-heading mb-6">
          {title}
        </h2>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={goPrev}
            disabled={stepIndex === 0}
            className="flex-shrink-0 w-12 h-12 rounded-xl glass-button flex items-center justify-center text-2xl font-medium text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--glass-active)] transition-colors"
            aria-label="Previous step"
          >
            &lt;
          </button>
          <div className="flex-1 min-w-0 overflow-hidden">
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{
                width: `${steps.length * 100}%`,
                transform: `translateX(-${(stepIndex / steps.length) * 100}%)`,
              }}
            >
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 px-2"
                  style={{ width: `${100 / steps.length}%` }}
                >
                  <div className="flex gap-4 items-start">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--sibling-primary)]/15 text-[var(--sibling-primary)] flex items-center justify-center text-sm font-semibold">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0 space-y-3">
                      <p className="text-foreground">{step}</p>
                      <StepImage platform={platform} stepNum={idx + 1} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={goNext}
            disabled={stepIndex === steps.length - 1}
            className="flex-shrink-0 w-12 h-12 rounded-xl glass-button flex items-center justify-center text-2xl font-medium text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--glass-active)] transition-colors"
            aria-label="Next step"
          >
            &gt;
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Step {stepIndex + 1} of {steps.length}
        </p>
      </div>
    </div>
  );
}
