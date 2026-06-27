'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart,
} from 'recharts';
import { SERIES_COLORS, GRADIENT_STOPS } from '@/lib/chart-colors';
import { Card } from '@/components/ui/Card';

export interface ProgressDataPoint {
  date: string;
  progress: number;
  courseId?: string;
  courseName?: string;
}

interface ProgressOverTimeChartProps {
  data: ProgressDataPoint[];
  isLoading?: boolean;
  error?: string | null;
  isDarkMode?: boolean;
  title?: string;
}

function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-72 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

export function ProgressOverTimeChart({
  data,
  isLoading = false,
  error = null,
  isDarkMode = false,
  title = 'Learning Progress Over Time',
}: ProgressOverTimeChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Group by date and calculate average if multiple courses
    const grouped = data.reduce(
      (acc, item) => {
        const existing = acc[item.date];
        if (existing) {
          existing.progress = (existing.progress + item.progress) / 2;
        } else {
          acc[item.date] = { ...item };
        }
        return acc;
      },
      {} as Record<string, ProgressDataPoint>,
    );

    return Object.values(grouped);
  }, [data]);

  const textColor = isDarkMode ? '#F3F4F6' : '#333333';
  const gridColor = isDarkMode ? '#374151' : '#E5E7EB';

  if (isLoading) return <ChartSkeleton />;

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600 dark:text-red-400">
          <p>Unable to load chart data</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <div className="flex h-72 items-center justify-center text-gray-500 dark:text-gray-400">
          <p>No progress data available yet</p>
        </div>
      </Card>
    );
  }

  const maxProgress = Math.max(...chartData.map(d => d.progress), 100);

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
              {GRADIENT_STOPS.primary.map((stop, idx) => (
                <stop
                  key={idx}
                  offset={stop.offset}
                  stopColor={stop.color}
                  stopOpacity={stop.stopOpacity}
                />
              ))}
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="date"
            stroke={textColor}
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke={textColor}
            domain={[0, Math.min(100, maxProgress * 1.1)]}
            style={{ fontSize: '12px' }}
            label={{ value: 'Progress (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
              borderRadius: '8px',
              color: textColor,
            }}
            formatter={(value: number) => [`${Math.round(value)}%`, 'Progress']}
          />
          <Area
            type="monotone"
            dataKey="progress"
            stroke={SERIES_COLORS[0]}
            fill="url(#progressGradient)"
            isAnimationActive={true}
            animationDuration={300}
            aria-label="Progress over time"
          />
        </AreaChart>
      </ResponsiveContainer>
      {/* Data table fallback for accessibility */}
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300">
          View as table
        </summary>
        <table className="mt-3 w-full border-collapse border border-gray-200 dark:border-gray-700">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900">
              <th className="border border-gray-200 px-3 py-2 text-left dark:border-gray-700">
                Date
              </th>
              <th className="border border-gray-200 px-3 py-2 text-right dark:border-gray-700">
                Progress (%)
              </th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="border border-gray-200 px-3 py-2 dark:border-gray-700">
                  {item.date}
                </td>
                <td className="border border-gray-200 px-3 py-2 text-right dark:border-gray-700">
                  {Math.round(item.progress)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
}
