'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface EarningsData {
  totalRevenue: number;
  totalTokens: number;
  pendingPayout: number;
  payouts: { id: string; amount: number; date: string; status: 'paid' | 'pending' }[];
}

const MOCK: EarningsData = {
  totalRevenue: 1240,
  totalTokens: 3800,
  pendingPayout: 320,
  payouts: [
    { id: 'p1', amount: 480, date: '2026-05-01', status: 'paid' },
    { id: 'p2', amount: 440, date: '2026-04-01', status: 'paid' },
    { id: 'p3', amount: 320, date: '2026-06-01', status: 'pending' },
  ],
};

export function EarningsPayouts() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/instructor/earnings')
      .then((r) => setData(r.data))
      .catch(() => setData(MOCK))
      .finally(() => setLoading(false));
  }, []);

  const d = data ?? MOCK;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Earnings & Payouts</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Revenue', value: loading ? '…' : `$${d.totalRevenue.toLocaleString()}`, color: 'text-green-600 dark:text-green-400' },
          { label: 'BST Earned', value: loading ? '…' : `${d.totalTokens.toLocaleString()} BST`, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Pending Payout', value: loading ? '…' : `$${d.pendingPayout.toLocaleString()}`, color: 'text-yellow-600 dark:text-yellow-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Payout History</h3>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                <tr>
                  {['Date', 'Amount', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                {d.payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-300">
                      {new Date(p.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                      ${p.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        p.status === 'paid'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
