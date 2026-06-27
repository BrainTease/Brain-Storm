'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { ProposalCard } from './ProposalCard';
import { Proposal } from '@/store/governanceStore';

export interface ProposalListProps {
  proposals: Proposal[];
  loading?: boolean;
  error?: string | null;
  onLoadMore?: () => void;
  hasMore?: boolean;
  filter?: 'all' | 'active' | 'passed' | 'failed' | 'cancelled';
}

export function ProposalList({
  proposals,
  loading,
  error,
  onLoadMore,
  hasMore,
  filter = 'all',
}: ProposalListProps) {
  const [filteredProposals, setFilteredProposals] = useState<Proposal[]>(proposals);

  useEffect(() => {
    if (filter === 'all') {
      setFilteredProposals(proposals);
    } else {
      setFilteredProposals(proposals.filter((p) => p.status === filter));
    }
  }, [proposals, filter]);

  if (loading && proposals.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Loading proposals…" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <p className="text-center text-red-700 dark:text-red-400">
          Failed to load proposals. Please try again later.
        </p>
        <p className="text-center text-sm text-red-600 dark:text-red-500 mt-2">{error}</p>
      </Card>
    );
  }

  if (filteredProposals.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          {filter === 'all'
            ? 'No proposals found.'
            : `No ${filter} proposals found.`}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProposals.map((proposal) => (
          <ProposalCard key={proposal.id} proposal={proposal} />
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            aria-label="Load more proposals"
          >
            {loading && <Spinner size="sm" />}
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
