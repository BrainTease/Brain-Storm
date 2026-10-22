'use client';

import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
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
    return <LoadingState label="Loading proposals…" className="py-16" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load proposals."
        message="Please try again later."
        errorCode={error}
      />
    );
  }

  if (filteredProposals.length === 0) {
    return (
      <EmptyState
        title={filter === 'all' ? 'No proposals found.' : `No ${filter} proposals found.`}
      />
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
