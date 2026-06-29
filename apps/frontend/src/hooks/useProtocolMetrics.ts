'use client';

import { useEffect, useState, useCallback } from 'react';

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
  const [series, setSeries] = useState<MetricPoint[]>([]);
  const [lastAggregatedAt, setLastAggregatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ metric, interval });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (dimension) params.set('dimension', dimension);

      const res = await fetch(`${API}/v1/protocol-metrics/time-series?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: TimeSeriesResult = await res.json();
      setSeries(data.series);
      setLastAggregatedAt(data.lastAggregatedAt);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }, [metric, interval, from, to, dimension]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { series, lastAggregatedAt, loading, error, refresh: fetchData };
}

interface UseProtocolSummaryReturn {
  summary: ProtocolSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useProtocolSummary(): UseProtocolSummaryReturn {
  const [summary, setSummary] = useState<ProtocolSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/v1/protocol-metrics/summary`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSummary(await res.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { summary, loading, error, refresh: fetchData };
}
