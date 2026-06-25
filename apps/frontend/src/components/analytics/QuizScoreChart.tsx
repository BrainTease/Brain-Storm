'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { SERIES_COLORS, CHART_COLORS } from '@/lib/chart-colors';
import { Card } from '@/components/ui/Card';

export interface QuizScoreDataPoint {
  date: string;
  score: number;
  maxScore?: number;
  quizName?: string;
  attempts?: number;
}

interface QuizScoreChartProps {
  data: QuizScoreDataPoint[];
  isLoading?: boolean;
  error?: string | null;
  isDarkMode?: boolean;
  title?: string;
}

function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-72 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 85) {
    return CHART_COLORS.excellent; // Blue - excellent
  } else if (score >= 70) {
    return SERIES_COLORS[4]; // Pink - good
  } else if (score >= 55) {
    return SERIES_COLORS[1]; // Orange - average
  }
  return CHART_COLORS.poor; // Purple - needs improvement
}

export function QuizScoreChart({
  data,
  isLoading = false,
  error = null,
  isDarkMode = false,
  title = 'Quiz Performance',
}: QuizScoreChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Ensure scores are normalized to 0-100 range
    return data.map(item => ({
      ...item,
      score: item.maxScore ? (item.score / item.maxScore) * 100 : item.score,
      displayScore: item.maxScore ? item.score : item.score,
    }));
  }, [data]);

  const textColor = isDarkMode ? '#F3F4F6' : '#333333';
  const gridColor = isDarkMode ? '#374151' : '#E5E7EB';

  const avgScore =
    chartData.length > 0 ? Math.round(chartData.reduce((sum, d) => sum + d.score, 0) / chartData.length) : 0;

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
          <p>No quiz data available yet</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <div className="text-right">
          <p className="text-sm text-gray-600 dark:text-gray-400">Average Score</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgScore}%</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="date"
            stroke={textColor}
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke={textColor}
            domain={[0, 100]}
            style={{ fontSize: '12px' }}
            label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
              borderRadius: '8px',
              color: textColor,
            }}
            formatter={(value: number) => [`${Math.round(value)}%`, 'Score']}
            labelFormatter={(label) => `Quiz: ${label}`}
          />
          <Bar
            dataKey="score"
            isAnimationActive={true}
            animationDuration={300}
            radius={[8, 8, 0, 0]}
            aria-label="Quiz performance scores"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Performance summary */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-200 bg-blue-50 p-3 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-600 dark:text-gray-400">Excellent (85-100%)</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {chartData.filter(d => d.score >= 85).length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-orange-50 p-3 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-600 dark:text-gray-400">Good (70-84%)</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {chartData.filter(d => d.score >= 70 && d.score < 85).length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-purple-50 p-3 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-600 dark:text-gray-400">Needs Work (&lt;70%)</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {chartData.filter(d => d.score < 70).length}
          </p>
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
                Score (%)
              </th>
              {chartData.some(d => d.attempts) && (
                <th className="border border-gray-200 px-3 py-2 text-right dark:border-gray-700">
                  Attempts
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {chartData.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="border border-gray-200 px-3 py-2 dark:border-gray-700">
                  {item.date}
                </td>
                <td className="border border-gray-200 px-3 py-2 text-right dark:border-gray-700">
                  {Math.round(item.score)}%
                </td>
                {chartData.some(d => d.attempts) && (
                  <td className="border border-gray-200 px-3 py-2 text-right dark:border-gray-700">
                    {item.attempts ?? '-'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
}
