'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export type ApprovalStats = {
  approved: number;
  rejected: number;
  pending: number;
};

type ApprovedAssetsPieChartProps = {
  data: ApprovalStats;
  className?: string;
};

const PIE_COLORS = {
  approved: 'var(--success)',
  rejected: 'var(--destructive)',
  pending: 'var(--muted-foreground)',
};

export function ApprovedAssetsPieChart({ data, className = '' }: ApprovedAssetsPieChartProps) {
  const chartData = [
    { name: 'Approved', value: data.approved, fill: PIE_COLORS.approved },
    { name: 'Rejected', value: data.rejected, fill: PIE_COLORS.rejected },
    { name: 'Pending', value: data.pending, fill: PIE_COLORS.pending },
  ].filter((d) => d.value > 0);

  const total = data.approved + data.rejected + data.pending;

  if (total === 0) {
    return (
      <div
        className={`flex items-center justify-center h-64 text-muted-foreground text-sm ${className}`}
      >
        No assets yet
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={60}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} stroke="var(--background)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
            }}
            formatter={(value: number | undefined) => {
              const v = value ?? 0;
              return [`${v} (${total > 0 ? Math.round((v / total) * 100) : 0}%)`, ''];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => (
              <span style={{ color: 'var(--foreground)' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
