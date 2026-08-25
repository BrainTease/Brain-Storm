'use client';

import React from 'react';
import { NFTCard, type NFTItem } from './NFTCard';
import { Skeleton } from '@/components/ui/Skeleton';

export interface NFTGridProps {
  items: NFTItem[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onBuy?: (nft: NFTItem) => void;
  onTransfer?: (nft: NFTItem) => void;
  onView?: (nft: NFTItem) => void;
  onList?: (nft: NFTItem) => void;
  onDelist?: (nft: NFTItem) => void;
  columns?: 2 | 3 | 4;
  className?: string;
}

function NFTCardSkeleton() {
  return (
    <div
      data-testid="nft-card-skeleton"
      className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden flex flex-col space-y-3"
    >
      <Skeleton className="h-44 w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function NFTGrid({
  items,
  isLoading = false,
  emptyTitle = 'No NFTs Found',
  emptyDescription = 'There are no NFT items or certificates available to display.',
  emptyAction,
  onBuy,
  onTransfer,
  onView,
  onList,
  onDelist,
  columns = 3,
  className = '',
}: NFTGridProps) {
  const columnClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }[columns];

  if (isLoading) {
    return (
      <div
        data-testid="nft-grid-loading"
        className={`grid gap-5 ${columnClasses} ${className}`}
        aria-busy="true"
      >
        {Array.from({ length: columns * 2 }).map((_, i) => (
          <NFTCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        data-testid="nft-grid-empty"
        className="text-center py-12 px-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-850/50 my-4"
      >
        <span className="text-4xl block mb-2" role="img" aria-label="No items">
          🔍
        </span>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          {emptyTitle}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
          {emptyDescription}
        </p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div
      data-testid="nft-grid"
      className={`grid gap-5 ${columnClasses} ${className}`}
      role="list"
    >
      {items.map((nft) => (
        <div key={nft.id} role="listitem">
          <NFTCard
            nft={nft}
            onBuy={onBuy}
            onTransfer={onTransfer}
            onView={onView}
            onList={onList}
            onDelist={onDelist}
          />
        </div>
      ))}
    </div>
  );
}

export default NFTGrid;
