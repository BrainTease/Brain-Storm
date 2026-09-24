import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import AdminDashboard from '@/components/admin/AdminDashboard';

const mockFetchDashboardMetrics = vi.fn();
const mockApiGet = vi.fn();

vi.mock('@/lib/admin-api', () => ({
  fetchDashboardMetrics: mockFetchDashboardMetrics,
}));

vi.mock('@/lib/api', () => ({
  default: {
    get: mockApiGet,
  },
}));

const mockMetrics = {
  totalUsers: 1500,
  activeWorkers: 340,
  tipVolume: 15000,
  disputeRate: 2.5,
  totalCourses: 45,
  totalEnrollments: 890,
  totalCompletions: 650,
  completionRate: 73,
  averageRating: 4.5,
  newUsersLast30Days: 200,
  growth: 12.5,
};

describe('AdminDashboard Component', () => {
  beforeEach(() => {
    mockFetchDashboardMetrics.mockClear();
    mockApiGet.mockClear();
  });

  it('should render loading state initially', () => {
    mockFetchDashboardMetrics.mockImplementation(() => new Promise(() => {}));

    render(<AdminDashboard />);
    const spinner = screen.getByRole('img', { hidden: true });
    expect(spinner).toBeInTheDocument();
  });

  it('should render metrics after successful fetch', async () => {
    mockFetchDashboardMetrics.mockResolvedValue({
      ok: true,
      data: mockMetrics,
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('1,500')).toBeInTheDocument();
    });
  });

  it('should render error state when fetch fails', async () => {
    mockFetchDashboardMetrics.mockResolvedValue({
      ok: false,
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard metrics')).toBeInTheDocument();
    });
  });

  it('should update date range when inputs change', async () => {
    mockFetchDashboardMetrics.mockResolvedValue({
      ok: true,
      data: mockMetrics,
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    const startDateInput = screen.getAllByDisplayValue('')[0] as HTMLInputElement;
    fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });

    await waitFor(() => {
      expect(mockFetchDashboardMetrics).toHaveBeenCalledWith({
        startDate: '2024-01-01',
        endDate: undefined,
      });
    });
  });

  it('should handle export button click', async () => {
    mockFetchDashboardMetrics.mockResolvedValue({
      ok: true,
      data: mockMetrics,
    });

    mockApiGet.mockResolvedValue({
      data: new Blob(['csv data']),
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith('/admin/analytics/export?', {
        responseType: 'blob',
      });
    });
  });
});
