'use client';

import React from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/Card';
import { formatDateShort } from '@/lib/date-utils';
import { Button } from '@/components/ui/Button';
import { TokenBalance } from '@/components/ui/TokenBalance';
import { NFTMetadataBadge } from './NFTMetadataBadge';

export interface NFTItem {
  id: string | number;
  title: string;
  courseName?: string;
  description?: string;
  imageUrl?: string;
  owner?: string;
  instructor?: string;
  price?: number | string;
  currency?: string;
  royaltyBasis?: number;
  isListed?: boolean;
  issuedAt?: string;
  txHash?: string;
  isCompleted?: boolean;
}

export interface NFTCardProps {
  nft: NFTItem;
  onBuy?: (nft: NFTItem) => void;
  onTransfer?: (nft: NFTItem) => void;
  onView?: (nft: NFTItem) => void;
  onList?: (nft: NFTItem) => void;
  onDelist?: (nft: NFTItem) => void;
  className?: string;
  compact?: boolean;
}

export function NFTCard({
  nft,
  onBuy,
  onTransfer,
  onView,
  onList,
  onDelist,
  className = '',
  compact = false,
}: NFTCardProps) {
  const truncatedOwner = nft.owner ? `${nft.owner.slice(0, 6)}…${nft.owner.slice(-4)}` : undefined;

  const royaltyPercentage =
    nft.royaltyBasis !== undefined ? `${(nft.royaltyBasis / 100).toFixed(1)}%` : undefined;

  return (
    <Card
      data-testid="nft-card"
      className={`flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${className}`}
    >
      {/* Visual media / Header banner */}
      <div className="relative w-full h-44 bg-gradient-to-tr from-blue-600 to-indigo-800 flex items-center justify-center overflow-hidden">
        {nft.imageUrl ? (
          <Image
            src={nft.imageUrl}
            alt={nft.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-white text-center">
            <span className="text-4xl mb-1 select-none" aria-hidden="true">
              📜
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
              Soroban Smart NFT
            </span>
          </div>
        )}

        {/* Status badges */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          {nft.isCompleted && <NFTMetadataBadge label="Completed" variant="success" />}
          {nft.isListed && <NFTMetadataBadge label="Listed" variant="primary" />}
        </div>

        <div className="absolute bottom-2 left-2">
          <NFTMetadataBadge label={`#${nft.id}`} variant="neutral" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h3 className="font-semibold text-base text-gray-900 dark:text-white line-clamp-1">
            {nft.title}
          </h3>
          {nft.courseName && nft.courseName !== nft.title && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
              {nft.courseName}
            </p>
          )}

          {!compact && nft.description && (
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
              {nft.description}
            </p>
          )}
        </div>

        {/* Metadata Badges */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {royaltyPercentage && (
            <NFTMetadataBadge
              label="Royalty"
              value={royaltyPercentage}
              variant="royalty"
              title={`${nft.royaltyBasis} bps secondary royalty fee`}
            />
          )}
          {truncatedOwner && (
            <NFTMetadataBadge
              label="Owner"
              value={truncatedOwner}
              variant="neutral"
              title={nft.owner}
            />
          )}
        </div>

        {/* Pricing / Transaction details */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            {nft.price !== undefined ? (
              <div>
                <span className="text-xs text-gray-400 block">Price</span>
                <TokenBalance
                  balance={nft.price}
                  symbol={nft.currency ?? 'BST'}
                  decimals={7}
                  className="text-base font-bold text-blue-600 dark:text-blue-400"
                />
              </div>
            ) : nft.issuedAt ? (
              <div>
                <span className="text-xs text-gray-400 block">Issued</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {formatDateShort(nft.issuedAt)}
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">Not listed</span>
            )}
          </div>

          {nft.txHash && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${nft.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 underline"
            >
              Verify Tx ↗
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {onView && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onView(nft)}
            >
              View
            </Button>
          )}
          {nft.isListed && onBuy && (
            <Button size="sm" className="flex-1 text-xs" onClick={() => onBuy(nft)}>
              Buy NFT
            </Button>
          )}
          {!nft.isListed && onList && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onList(nft)}
            >
              List
            </Button>
          )}
          {nft.isListed && onDelist && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950"
              onClick={() => onDelist(nft)}
            >
              Delist
            </Button>
          )}
          {onTransfer && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => onTransfer(nft)}
            >
              Transfer
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default NFTCard;
