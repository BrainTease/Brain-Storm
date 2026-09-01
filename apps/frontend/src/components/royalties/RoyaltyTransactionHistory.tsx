'use client';

import React from 'react';
import { DataGrid, type ColumnDef } from '@/components/ui/DataGrid';

const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet'
    ? 'https://stellar.expert/explorer/public/tx'
    : 'https://stellar.expert/explorer/testnet/tx';

export interface RoyaltyTx {
  id: string;
  date: string;
  course: string;
  recipient: string;
  royaltyPct: number;
  amount: string;
  txHash?: string;
}

const COLUMNS: ColumnDef<RoyaltyTx>[] = [
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
    key: 'recipient',
    header: 'Recipient',
    sortable: true,
    width: '150px',
    render: (row) => (
      <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
        {row.recipient.length > 14
          ? `${row.recipient.slice(0, 6)}…${row.recipient.slice(-4)}`
          : row.recipient}
      </span>
    ),
  },
  {
    key: 'royaltyPct',
    header: 'Royalty %',
    sortable: true,
    width: '110px',
    render: (row) => <span className="text-gray-700 dark:text-gray-300">{row.royaltyPct}%</span>,
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
    key: 'txHash',
    header: 'Tx Hash',
    render: (row) =>
      row.txHash ? (
        <a
          href={`${EXPLORER_BASE}/${row.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline"
          aria-label={`View royalty transaction ${row.txHash} on Stellar Expert`}
        >
          {row.txHash.slice(0, 8)}…{row.txHash.slice(-6)}
        </a>
      ) : (
        <span className="text-gray-400">—</span>
      ),
  },
];

interface RoyaltyTransactionHistoryProps {
  transactions: RoyaltyTx[];
  isLoading?: boolean;
}

export function RoyaltyTransactionHistory({
  transactions,
  isLoading = false,
}: RoyaltyTransactionHistoryProps) {
  return (
    <section aria-label="Royalty transaction history">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Royalty Payments
      </h3>
      <DataGrid<RoyaltyTx>
        columns={COLUMNS}
        rows={transactions}
        pageSize={10}
        isLoading={isLoading}
        emptyText="No royalty transactions found."
        aria-label="Royalty transactions"
        getRowKey={(row) => row.id}
      />
    </section>
  );
}
