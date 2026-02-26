'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const LEGEND_ENTRIES = [
  { key: '24×7', fill: 'var(--chart-1)' },
  { key: 'Scheduled (Recurring)', fill: 'var(--chart-2)' },
  { key: 'Scheduled (One-time)', fill: 'var(--chart-3)' },
  { key: 'TikTok', fill: 'var(--chart-4)' },
  { key: 'Reels', fill: 'var(--chart-2)' },
  { key: 'YouTube Shorts', fill: 'var(--chart-5)' },
  { key: 'Generic', fill: 'var(--chart-3)' },
] as const;

export type ContentUsageData = {
  webinar24x7: number;
  webinarScheduledRecurring: number;
  webinarScheduledOnetime: number;
  shortsTiktok: number;
  shortsReels: number;
  shortsYoutube: number;
  shortsGeneric: number;
};

type WebinarVsShortsChartProps = {
  data: ContentUsageData;
  className?: string;
};

export function WebinarVsShortsChart({ data, className = '' }: WebinarVsShortsChartProps) {
  const totalWebinar =
    data.webinar24x7 +
    data.webinarScheduledRecurring +
    data.webinarScheduledOnetime;
  const totalShorts =
    data.shortsTiktok +
    data.shortsReels +
    data.shortsYoutube +
    data.shortsGeneric;

  if (totalWebinar === 0 && totalShorts === 0) {
    return (
      <div
        className={`flex items-center justify-center h-64 text-muted-foreground text-sm ${className}`}
      >
        No content usage data yet
      </div>
    );
  }

  const displayData = [
    {
      category: 'Webinar',
      '24×7': data.webinar24x7,
      'Scheduled (Recurring)': data.webinarScheduledRecurring,
      'Scheduled (One-time)': data.webinarScheduledOnetime,
      total: totalWebinar,
    },
    {
      category: 'Shorts',
      'TikTok': data.shortsTiktok,
      'Reels': data.shortsReels,
      'YouTube Shorts': data.shortsYoutube,
      'Generic': data.shortsGeneric,
      total: totalShorts,
    },
  ].filter((d) => d.total > 0);

  const [showIndex, setShowIndex] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <div
        className="absolute top-0 right-0 z-10"
        onMouseEnter={() => setShowIndex(true)}
        onMouseLeave={() => setShowIndex(false)}
      >
        <button
          type="button"
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/50"
        >
          Index
        </button>
        {showIndex && (
          <div
            className="absolute top-full right-0 mt-1 py-2 px-3 min-w-[180px] rounded-md border border-border bg-popover shadow-md"
            style={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div className="flex flex-col gap-1.5">
              {LEGEND_ENTRIES.map(({ key, fill }) => (
                <div
                  key={key}
                  className="flex items-center gap-2 text-xs"
                  style={{ color: 'var(--foreground)' }}
                >
                  <span
                    className="shrink-0 w-3 h-3 rounded-sm"
                    style={{ backgroundColor: fill }}
                  />
                  <span>{key}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={displayData}
          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
          layout="vertical"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--glass-border)"
            horizontal={false}
          />
          <XAxis
            type="number"
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="category"
            stroke="var(--muted-foreground)"
            tick={{ fontSize: 12 }}
            width={70}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
            }}
            labelStyle={{ color: 'var(--foreground)' }}
          />
          <Bar dataKey="24×7" stackId="webinar" fill="var(--chart-1)" />
          <Bar
            dataKey="Scheduled (Recurring)"
            stackId="webinar"
            fill="var(--chart-2)"
          />
          <Bar
            dataKey="Scheduled (One-time)"
            stackId="webinar"
            fill="var(--chart-3)"
          />
          <Bar dataKey="TikTok" stackId="shorts" fill="var(--chart-4)" />
          <Bar dataKey="Reels" stackId="shorts" fill="var(--chart-2)" />
          <Bar dataKey="YouTube Shorts" stackId="shorts" fill="var(--chart-5)" />
          <Bar dataKey="Generic" stackId="shorts" fill="var(--chart-3)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
