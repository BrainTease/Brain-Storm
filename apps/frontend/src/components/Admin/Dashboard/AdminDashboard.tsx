'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/admin-api';

interface DashboardMetrics {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalCompletions: number;
  completionRate: number;
  averageRating: number;
  totalReviews: number;
  activeLearnersLast30Days: number;
  newUsersLast30Days: number;
  newEnrollmentsLast30Days: number;
  growth: number;
  activeWorkers: number;
  tipVolume: number;
  disputeRate: number;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      const response = await adminApi.get(`/admin/analytics/dashboard?${params}`);
      setMetrics(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (dateRange.startDate) params.append('startDate', dateRange.startDate);
      if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      
      const response = await adminApi.get(`/admin/analytics/export?${params}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'admin-analytics.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export metrics:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!metrics) {
    return <div className="p-4 text-gray-500">Failed to load dashboard metrics</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 border rounded-md text-sm"
            placeholder="Start Date"
          />
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 border rounded-md text-sm"
            placeholder="End Date"
          />
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={metrics.totalUsers}
          trend={metrics.growth}
          subtitle="Platform users"
        />
        <MetricCard
          title="Active Workers"
          value={metrics.activeWorkers}
          subtitle="Last 30 days"
        />
        <MetricCard
          title="Tip Volume"
          value={`$${metrics.tipVolume.toLocaleString()}`}
          subtitle="In period"
        />
        <MetricCard
          title="Dispute Rate"
          value={`${metrics.disputeRate}%`}
          subtitle="Of transactions"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Courses" value={metrics.totalCourses} />
        <StatCard title="Total Enrollments" value={metrics.totalEnrollments} />
        <StatCard title="Completions" value={metrics.totalCompletions} />
        <StatCard title="Completion Rate" value={`${metrics.completionRate}%`} />
        <StatCard title="Avg Rating" value={metrics.averageRating.toFixed(1)} />
        <StatCard title="New Users (30d)" value={metrics.newUsersLast30Days} />
      </div>
    </div>
  );
}

function MetricCard({ title, value, trend, subtitle }: { 
  title: string; 
  value: string | number; 
  trend?: number;
  subtitle: string;
}) {
  return (
    <div className="bg-white p-4 rounded-lg shadow border">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold mt-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {trend !== undefined && (
        <div className={`text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}%
        </div>
      )}
      <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow border">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-xl font-semibold mt-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  );
}