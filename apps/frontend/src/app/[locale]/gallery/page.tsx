'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { NFTGrid, type NFTItem } from '@/components/nft';
import { useWallet } from '@/lib/wallet';

export default function NFTGalleryPage() {
  const [items, setItems] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { isConnected } = useWallet();

  useEffect(() => {
    // Load marketplace NFT items / course credentials
    api
      .get<{ data: NFTItem[] }>('/nft/gallery')
      .then((res) => setItems(res.data.data ?? []))
      .catch(() => {
        // Fallback demo/initial data
        setItems([
          {
            id: '1',
            title: 'Soroban Smart Contract Auditor',
            courseName: 'Soroban Security 201',
            description: 'Accredited certificate on Stellar Soroban testnet.',
            price: 50,
            currency: 'BST',
            royaltyBasis: 500,
            isListed: true,
            isCompleted: true,
          },
          {
            id: '2',
            title: 'Stellar Protocol Developer',
            courseName: 'Core Protocol Engineering',
            description: 'Advanced mastery badge for Horizon and Soroban RPC integrations.',
            price: 100,
            currency: 'BST',
            royaltyBasis: 250,
            isListed: true,
            isCompleted: true,
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="max-w-6xl mx-auto p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            NFT Collectibles & Gallery
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Browse, collect, and trade verifiable educational NFTs and on-chain certificates.
          </p>
        </div>
      </div>

      <NFTGrid
        items={items}
        isLoading={loading}
        columns={3}
        onBuy={(nft) => {
          alert(`Initiating purchase for NFT #${nft.id} (${nft.title})`);
        }}
        onView={(nft) => {
          alert(`Viewing details for NFT #${nft.id}`);
        }}
      />
    </main>
  );
}
