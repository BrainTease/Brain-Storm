'use client';

import React from 'react';
import { DataGrid, type ColumnDef } from '@/components/ui/DataGrid';
import { Badge } from '@/components/ui/Badge';

export interface WalletTransaction {
  id: string;
  date: string;
  type: 'sent' | 'received' | 'swap' | 'reward';
  amount: string;
  asset: string;
  status: 'confirmed' | 'pending' | 'failed';
  txHash?: string;
}

const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet'
    ? 'https://stellar.expert/explorer/public/tx'
    : 'https://stellar.expert/explorer/testnet/tx';

const STATUS_STYLES: Record<WalletTransaction['status'], string> = {
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const TYPE_LABELS: Record<WalletTransaction['type'], string> = {
  sent: 'Sent',
  received: 'Received',
  swap: 'Swap',
  reward: 'Reward',
};

const COLUMNS: ColumnDef<WalletTransaction>[] = [
  {
    key: 'date',
    header: 'Date',
    sortable: true,
    width: '160px',
    render: (row) => (
      <span className="text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{row.date}</span>
    ),
  },
  {
    key: 'type',
    header: 'Type',
    sortable: true,
    width: '100px',
    render: (row) => <span className="font-medium capitalize">{TYPE_LABELS[row.type]}</span>,
  },
  {
    key: 'amount',
    header: 'Amount',
    sortable: true,
    width: '120px',
  },
  {
    key: 'asset',
    header: 'Asset',
    sortable: true,
    width: '80px',
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: '110px',
    render: (row) => <Badge className={STATUS_STYLES[row.status]}>{row.status}</Badge>,
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
          aria-label={`View transaction ${row.txHash} on Stellar Expert`}
        >
          {row.txHash.slice(0, 8)}…{row.txHash.slice(-6)}
        </a>
      ) : (
        <span className="text-gray-400">—</span>
      ),
  },
];

interface TransactionHistoryProps {
  transactions: WalletTransaction[];
  isLoading?: boolean;
}

export function TransactionHistory({ transactions, isLoading = false }: TransactionHistoryProps) {
  return (
    <section aria-label="Wallet transaction history">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Transaction History
      </h3>
      <DataGrid<WalletTransaction>
        columns={COLUMNS}
        rows={transactions}
        pageSize={10}
        isLoading={isLoading}
        emptyText="No transactions found."
        aria-label="Wallet transactions"
        getRowKey={(row) => row.id}
      />
    </section>
  );
}
