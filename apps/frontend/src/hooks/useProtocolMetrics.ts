'use client';

import { useApiQuery } from '@/hooks/useApiQuery';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export type MetricInterval = 'hour' | 'day' | 'week';
export type MetricName = 'registrations' | 'tip_volume' | 'escrow_throughput' | 'dispute_outcomes';

export interface MetricPoint {
  id: string;
  metric: MetricName;
  interval: MetricInterval;
  bucketStart: string;
  value: number;
  dimension: string | null;
  aggregatedAt: string;
}

export interface ProtocolSummary {
  registrations: number;
  tipVolumeXlm: number;
  escrowThroughput: number;
  disputeResolved: number;
  lastAggregatedAt: string | null;
}

interface TimeSeriesResult {
  series: MetricPoint[];
  lastAggregatedAt: string | null;
}

interface UseProtocolMetricsOptions {
  metric: MetricName;
  interval?: MetricInterval;
  from?: string;
  to?: string;
  dimension?: string;
}

interface UseProtocolMetricsReturn {
  series: MetricPoint[];
  lastAggregatedAt: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useProtocolMetrics({
  metric,
  interval = 'day',
  from,
  to,
  dimension,
}: UseProtocolMetricsOptions): UseProtocolMetricsReturn {
  const { data, isLoading, error, refresh } = useApiQuery<TimeSeriesResult>(
    [
      'protocol-metrics',
      'time-series',
      metric,
      interval,
      from ?? null,
      to ?? null,
      dimension ?? null,
    ],
    async () => {
      const params = new URLSearchParams({ metric, interval });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (dimension) params.set('dimension', dimension);

      const res = await fetch(`${API}/v1/protocol-metrics/time-series?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }
  );

  return {
    series: data?.series ?? [],
    lastAggregatedAt: data?.lastAggregatedAt ?? null,
    loading: isLoading,
    error,
    refresh,
  };
}

interface UseProtocolSummaryReturn {
  summary: ProtocolSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useProtocolSummary(): UseProtocolSummaryReturn {
  const { data, isLoading, error, refresh } = useApiQuery<ProtocolSummary>(
    ['protocol-metrics', 'summary'],
    async () => {
      const res = await fetch(`${API}/v1/protocol-metrics/summary`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }
  );

  return { summary: data, loading: isLoading, error, refresh };
}
