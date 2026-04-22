'use client';

import React from 'react';

export type CallsTableColumn<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T, idx: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'right' | 'center';
};

export type CallsTableProps<T> = {
  columns: CallsTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T, idx: number) => string;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  dense?: boolean;
};

export function CallsTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  empty,
  dense = false,
}: CallsTableProps<T>) {
  if (rows.length === 0 && empty) {
    return (
      <div className="glass-card rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/50 p-10 text-center">
        {empty}
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl border border-[var(--glass-border)] bg-[var(--glass)]/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-[var(--glass-border)] bg-[var(--glass-hover)]/40">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 ${dense ? 'py-2' : 'py-2.5'} text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  <div
                    className={`flex ${
                      col.align === 'right'
                        ? 'justify-end'
                        : col.align === 'center'
                          ? 'justify-center'
                          : 'justify-start'
                    }`}
                  >
                    {col.header}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={getRowKey(row, idx)}
                className={`border-b border-[var(--glass-border)]/50 last:border-b-0 transition-colors ${
                  onRowClick
                    ? 'cursor-pointer hover:bg-[var(--glass-hover)]/40'
                    : ''
                }`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 ${dense ? 'py-2' : 'py-3'} align-middle ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                    }`}
                  >
                    {col.cell(row, idx)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
