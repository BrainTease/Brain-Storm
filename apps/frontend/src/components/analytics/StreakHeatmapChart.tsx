'use client';

import React, { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { CHART_COLORS } from '@/lib/chart-colors';

export interface StreakData {
  date: string;
  count: number;
  weekNumber: number;
  dayOfWeek: number;
}

interface StreakHeatmapChartProps {
  data: StreakData[];
  isLoading?: boolean;
  error?: string | null;
  isDarkMode?: boolean;
  title?: string;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-40 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

function getHeatmapColor(value: number, maxValue: number, isDarkMode: boolean): string {
  if (value === 0) {
    return isDarkMode ? '#374151' : '#F3F4F6';
  }

  const intensity = value / maxValue;

  if (intensity >= 0.75) {
    return '#0173B2'; // Dark blue - highest intensity
  } else if (intensity >= 0.5) {
    return '#56B4E9'; // Medium blue
  } else if (intensity >= 0.25) {
    return '#B0D9FF'; // Light blue
  }
  return isDarkMode ? '#4B5563' : '#E5EDF5'; // Very light blue
}

export function StreakHeatmapChart({
  data,
  isLoading = false,
  error = null,
  isDarkMode = false,
  title = 'Learning Streak Heatmap',
}: StreakHeatmapChartProps) {
  const heatmapData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Group by week and day
    const grouped: Record<number, Record<number, number>> = {};
    let maxValue = 1;

    data.forEach(item => {
      if (!grouped[item.weekNumber]) {
        grouped[item.weekNumber] = {};
      }
      grouped[item.weekNumber][item.dayOfWeek] = item.count;
      maxValue = Math.max(maxValue, item.count);
    });

    return { grouped, maxValue };
  }, [data]);

  const textColor = isDarkMode ? '#F3F4F6' : '#333333';

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

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <div className="flex h-40 items-center justify-center text-gray-500 dark:text-gray-400">
          <p>No streak data available yet. Start learning to build your streak!</p>
        </div>
      </Card>
    );
  }

  const { grouped, maxValue } = heatmapData;
  const weeks = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Day headers */}
          <div className="mb-2 flex gap-1">
            <div className="w-12" /> {/* Week number column */}
            {DAYS_OF_WEEK.map(day => (
              <div
                key={day}
                className="flex h-8 w-8 items-center justify-center text-xs font-medium"
                style={{ color: textColor }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {weeks.map(weekNum => (
            <div key={weekNum} className="mb-1 flex items-center gap-1">
              <div className="w-12 text-xs text-gray-500 dark:text-gray-400">W{weekNum}</div>
              {DAYS_OF_WEEK.map((_, dayIdx) => {
                const count = grouped[Number(weekNum)]?.[dayIdx] ?? 0;
                const bgColor = getHeatmapColor(count, maxValue, isDarkMode);

                return (
                  <div
                    key={`${weekNum}-${dayIdx}`}
                    className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-xs font-medium dark:border-gray-700"
                    style={{
                      backgroundColor: bgColor,
                      color: count > 0 ? '#FFFFFF' : textColor,
                    }}
                    title={`${DAYS_OF_WEEK[dayIdx]}: ${count} activity`}
                    role="img"
                    aria-label={`${DAYS_OF_WEEK[dayIdx]} Week ${weekNum}: ${count} activity`}
                  >
                    {count > 0 ? count : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs">
        <span style={{ color: textColor }}>Intensity:</span>
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 rounded border border-gray-300 dark:border-gray-600"
            style={{
              backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
            }}
          />
          <span style={{ color: textColor }}>None</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border border-gray-300 dark:border-gray-600" style={{ backgroundColor: '#B0D9FF' }} />
          <span style={{ color: textColor }}>Low</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border border-gray-300 dark:border-gray-600" style={{ backgroundColor: '#56B4E9' }} />
          <span style={{ color: textColor }}>Medium</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border border-gray-300 dark:border-gray-600" style={{ backgroundColor: '#0173B2' }} />
          <span style={{ color: textColor }}>High</span>
        </div>
      </div>

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
                Activity Count
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="border border-gray-200 px-3 py-2 dark:border-gray-700">
                  {item.date}
                </td>
                <td className="border border-gray-200 px-3 py-2 text-right dark:border-gray-700">
                  {item.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
}
