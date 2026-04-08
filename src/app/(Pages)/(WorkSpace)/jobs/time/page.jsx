'use client';

import { useEffect, useMemo, useState } from 'react';
import LoadingAnimation from '@/app/components/animations/loading';
import { useCurrentContext } from '@/app/components/common/useCurrentContext';

function toTimeHHMM(value) {
  if (!value) return '09:00';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '09:00';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

const FREQUENCIES = [
  { id: 'DAILY', label: 'Daily' },
  { id: 'MID_WEEKLY', label: 'Every ~3 days' },
  { id: 'WEEKLY', label: 'Weekly' },
  { id: 'MID_MONTHLY', label: 'Every ~15 days' },
  { id: 'MONTHLY', label: 'Monthly' },
];

export default function JobTimingPage() {
  const { loading: contextLoading, error: contextError, company } = useCurrentContext();

  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [frequency, setFrequency] = useState('MONTHLY');
  const [time, setTime] = useState('09:00');
  const [nextRunAt, setNextRunAt] = useState(null);
  const [lastRunAt, setLastRunAt] = useState(null);

  const nextRunLabel = useMemo(() => formatDateTime(nextRunAt), [nextRunAt]);
  const lastRunLabel = useMemo(() => formatDateTime(lastRunAt), [lastRunAt]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setFormError(null);
      setSuccessMsg(null);
      setInitialLoading(true);
      try {
        const res = await fetch('/api/jobs/time', { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setFormError(data?.error ?? 'Failed to load schedule');
          return;
        }
        const schedule = data?.schedule ?? null;
        if (!cancelled && schedule) {
          setFrequency(schedule.autoRefreshFrequency ?? 'MONTHLY');
          setNextRunAt(schedule.autoRefreshAt ?? null);
          setLastRunAt(schedule.autoRefreshLastRunAt ?? null);
          setTime(toTimeHHMM(schedule.autoRefreshAt));
        }
      } catch {
        if (!cancelled) setFormError('Network error');
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }

    if (!contextLoading && !contextError) load();

    return () => {
      cancelled = true;
    };
  }, [contextLoading, contextError]);

  const handleSave = async () => {
    setFormError(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      const res = await fetch('/api/jobs/time', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ frequency, time }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data?.error ?? 'Could not save schedule');
        return;
      }
      setNextRunAt(data?.schedule?.autoRefreshAt ?? null);
      setFrequency(data?.schedule?.autoRefreshFrequency ?? frequency);
      setSuccessMsg('Saved. Your jobs will run automatically at the selected time.');
    } catch {
      setFormError('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (contextLoading || initialLoading) {
    return (
      <div className="min-h-[70vh] px-6 py-6 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          <LoadingAnimation text="Loading schedule..." />
        </div>
      </div>
    );
  }

  if (contextError) {
    return (
      <div className="min-h-[70vh] px-6 py-6 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          <p className="text-sm text-destructive">{contextError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] px-6 py-6 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="mb-2">
          <h1 className="text-xl font-semibold text-foreground">Job Timing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose when Immortel runs background enrichment for{' '}
            <span className="font-semibold text-foreground">{company?.name ?? 'your company'}</span>.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)]/60 p-5 shadow-[var(--glass-shadow)] backdrop-blur-[var(--glass-blur)]">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-foreground">What this enables</div>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>Runs services automatically at your selected time, on your behalf.</li>
              <li>Refreshes your Company Radar.</li>
              <li>Fetches new topics and adds 15 more prompts.</li>
            </ul>
          </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground">Frequency</div>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full h-10 rounded-lg border border-[var(--glass-border)] bg-background/70 px-3 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              {FREQUENCIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground">Run time</div>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full h-10 rounded-lg border border-[var(--glass-border)] bg-background/70 px-3 text-sm text-foreground shadow-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="text-[11px] text-muted-foreground">
              Uses your browser’s local time-of-day.
            </div>
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Next run:</span>{' '}
            {nextRunLabel ?? 'Not scheduled yet'}
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Last run:</span>{' '}
            {lastRunLabel ?? '—'}
          </div>
        </div>

        {formError ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        ) : null}

        {successMsg ? (
          <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
            {successMsg}
          </div>
        ) : null}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="h-10 inline-flex items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save schedule'}
          </button>
          <div className="text-xs text-muted-foreground">
            After saving, the scheduler will run automatically.
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

