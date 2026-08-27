'use client';

import React from 'react';
import { DataGrid, type ColumnDef } from '@/components/ui/DataGrid';
import { Badge } from '@/components/ui/Badge';

export interface MarketplaceTx {
  id: string;
  date: string;
  course: string;
  buyer: string;
  seller: string;
  amount: string;
  fee: string;
  status: 'completed' | 'pending' | 'refunded' | 'failed';
}

const STATUS_STYLES: Record<MarketplaceTx['status'], string> = {
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  refunded: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const COLUMNS: ColumnDef<MarketplaceTx>[] = [
  {
    key: 'date',
    header: 'Date',
    sortable: true,
    width: '140px',
    render: (row) => (
      <span className="text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{row.date}</span>
    ),
  },
  {
    key: 'course',
    header: 'Course',
    sortable: true,
    render: (row) => (
      <span className="font-medium text-gray-900 dark:text-gray-100 max-w-[200px] truncate block">
        {row.course}
      </span>
    ),
  },
  {
    key: 'buyer',
    header: 'Buyer',
    sortable: true,
    width: '140px',
    render: (row) => (
      <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
        {row.buyer.length > 12 ? `${row.buyer.slice(0, 6)}…${row.buyer.slice(-4)}` : row.buyer}
      </span>
    ),
  },
  {
    key: 'seller',
    header: 'Seller',
    sortable: true,
    width: '140px',
    render: (row) => (
      <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
        {row.seller.length > 12 ? `${row.seller.slice(0, 6)}…${row.seller.slice(-4)}` : row.seller}
      </span>
    ),
  },
  {
    key: 'amount',
    header: 'Amount (BST)',
    sortable: true,
    width: '130px',
    render: (row) => (
      <span className="font-semibold text-gray-900 dark:text-gray-100">{row.amount} BST</span>
    ),
  },
  {
    key: 'fee',
    header: 'Fee (BST)',
    sortable: true,
    width: '110px',
    render: (row) => (
      <span className="text-gray-600 dark:text-gray-400">{row.fee} BST</span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: '110px',
    render: (row) => (
      <Badge className={STATUS_STYLES[row.status]}>{row.status}</Badge>
    ),
  },
];

interface MarketplaceTransactionHistoryProps {
  transactions: MarketplaceTx[];
  isLoading?: boolean;
}

export function MarketplaceTransactionHistory({
  transactions,
  isLoading = false,
}: MarketplaceTransactionHistoryProps) {
  return (
    <section aria-label="Marketplace transaction history">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Marketplace Transactions
      </h3>
      <DataGrid<MarketplaceTx>
        columns={COLUMNS}
        rows={transactions}
        pageSize={10}
        isLoading={isLoading}
        emptyText="No marketplace transactions found."
        aria-label="Marketplace transactions"
        getRowKey={(row) => row.id}
      />
    </section>
  );
}
