'use client';

import { useState } from 'react';
import {
  useProtocolMetrics,
  useProtocolSummary,
  type MetricInterval,
  type MetricName,
  type MetricPoint,
} from '@/hooks/useProtocolMetrics';

const INTERVALS: { value: MetricInterval; label: string }[] = [
  { value: 'hour', label: 'Hourly' },
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
];

const METRICS: { value: MetricName; label: string; unit?: string }[] = [
  { value: 'registrations', label: 'Registrations' },
  { value: 'tip_volume', label: 'Tip Volume', unit: 'XLM' },
  { value: 'escrow_throughput', label: 'Escrow Throughput' },
  { value: 'dispute_outcomes', label: 'Dispute Outcomes' },
];

export default function StatsPage() {
  const [interval, setInterval] = useState<MetricInterval>('day');
  const [metric, setMetric] = useState<MetricName>('registrations');

  const { summary, loading: sumLoading, error: sumError, refresh: refreshSummary } = useProtocolSummary();
  const { series, lastAggregatedAt, loading: tsLoading, error: tsError, refresh: refreshSeries } = useProtocolMetrics({ metric, interval });

  const metaMeta = METRICS.find((m) => m.value === metric);

  return (
    <main id="main-content" className="max-w-6xl mx-auto p-6 md:p-10 space-y-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Protocol Stats</h1>
        <p className="text-gray-600 dark:text-gray-400">
          On-chain event metrics aggregated from indexed Stellar contract activity.
        </p>
      </header>

      {/* Summary cards */}
      <section aria-labelledby="summary-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="summary-heading" className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            All-time Summary
          </h2>
          <FreshnessIndicator ts={summary?.lastAggregatedAt ?? null} loading={sumLoading} onRefresh={refreshSummary} />
        </div>

        {sumError ? (
          <ErrorBanner message={sumError} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard label="Registrations" value={summary?.registrations} loading={sumLoading} />
            <SummaryCard label="Tip Volume (XLM)" value={summary?.tipVolumeXlm} loading={sumLoading} decimals={2} />
            <SummaryCard label="Escrow Events" value={summary?.escrowThroughput} loading={sumLoading} />
            <SummaryCard label="Disputes Resolved" value={summary?.disputeResolved} loading={sumLoading} />
          </div>
        )}
      </section>

      {/* Time-series chart */}
      <section aria-labelledby="timeseries-heading">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <h2 id="timeseries-heading" className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex-1">
            Time Series
          </h2>

          {/* Metric selector */}
          <div role="tablist" aria-label="Metric" className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {METRICS.map((m) => (
              <button
                key={m.value}
                role="tab"
                type="button"
                aria-selected={metric === m.value}
                onClick={() => setMetric(m.value)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  metric === m.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Interval selector */}
          <div role="tablist" aria-label="Interval" className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {INTERVALS.map((iv) => (
              <button
                key={iv.value}
                role="tab"
                type="button"
                aria-selected={interval === iv.value}
                onClick={() => setInterval(iv.value)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  interval === iv.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {iv.label}
              </button>
            ))}
          </div>

          <FreshnessIndicator ts={lastAggregatedAt} loading={tsLoading} onRefresh={refreshSeries} />
        </div>

        {tsError ? (
          <ErrorBanner message={tsError} />
        ) : tsLoading ? (
          <ChartSkeleton />
        ) : series.length === 0 ? (
          <p className="text-center py-16 text-gray-500 dark:text-gray-400">No data available yet.</p>
        ) : (
          <BarChart series={series} unit={metaMeta?.unit} />
        )}
      </section>
    </main>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  loading,
  decimals = 0,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  decimals?: number;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      {loading ? (
        <div className="h-7 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      ) : (
        <p className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
          {value !== undefined ? value.toFixed(decimals) : '—'}
        </p>
      )}
    </div>
  );
}

function FreshnessIndicator({
  ts,
  loading,
  onRefresh,
}: {
  ts: string | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const age = ts ? Math.floor((Date.now() - new Date(ts).getTime()) / 60_000) : null;
  const stale = age !== null && age > 60;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          loading ? 'bg-yellow-400 animate-pulse' : stale ? 'bg-red-400' : 'bg-green-400'
        }`}
        aria-hidden="true"
      />
      {loading ? (
        <span>Updating…</span>
      ) : ts ? (
        <span title={new Date(ts).toISOString()}>
          Updated {age === 0 ? 'just now' : `${age}m ago`}
          {stale && ' (stale)'}
        </span>
      ) : (
        <span>No data</span>
      )}
      <button
        type="button"
        onClick={onRefresh}
        aria-label="Refresh metrics"
        className="ml-1 rounded p-0.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        ↻
      </button>
    </div>
  );
}

function BarChart({ series, unit }: { series: MetricPoint[]; unit?: string }) {
  const maxVal = Math.max(...series.map((p) => p.value), 1);

  return (
    <div
      role="img"
      aria-label="Protocol metrics bar chart"
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 overflow-x-auto"
    >
      <div className="flex items-end gap-1 min-w-max h-40">
        {series.map((point) => {
          const heightPct = (point.value / maxVal) * 100;
          const label = new Date(point.bucketStart).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          });
          return (
            <div key={point.id} className="flex flex-col items-center gap-1 w-10">
              <span className="text-[10px] tabular-nums text-gray-500 dark:text-gray-400">
                {point.value > 0 ? formatShort(point.value) : ''}
              </span>
              <div
                title={`${label}: ${point.value}${unit ? ' ' + unit : ''}${point.dimension ? ' (' + point.dimension + ')' : ''}`}
                style={{ height: `${Math.max(heightPct, 2)}%` }}
                className="w-full rounded-t bg-blue-500 dark:bg-blue-400 transition-all duration-300"
              />
              <span className="text-[9px] text-gray-400 dark:text-gray-500 rotate-[-30deg] origin-top-left whitespace-nowrap">
                {label}
              </span>
            </div>
          );
        })}
      </div>
      {unit && (
        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-right">Unit: {unit}</p>
      )}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 h-56 flex items-center justify-center">
      <div className="w-full flex items-end gap-1 h-32">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            style={{ height: `${20 + Math.sin(i) * 40 + 40}%` }}
            className="flex-1 rounded-t bg-gray-200 dark:bg-gray-700 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400">
      Failed to load data: {message}
    </div>
  );
}

function formatShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(n % 1 === 0 ? 0 : 2);
}
