'use client';

import { useEffect, useState } from 'react';
import { useWalletStore } from '@/store/walletStore';
import { useGovernance } from '@/hooks/useGovernance';
import { ProposalList, VotingPowerCard } from '@/components/governance';

type FilterType = 'all' | 'active' | 'passed' | 'failed' | 'cancelled';

export default function GovernancePage() {
  const { address: walletAddress } = useWalletStore();
  const {
    proposals,
    userVotingPower,
    loading,
    error,
    loadProposals,
    loadVotingPower,
    loadUserVotes,
  } = useGovernance();

  const [filter, setFilter] = useState<FilterType>('all');
  const [votingPowerLoading, setVotingPowerLoading] = useState(false);

  // Load voting power when wallet connects
  useEffect(() => {
    if (walletAddress) {
      setVotingPowerLoading(true);
      Promise.all([loadVotingPower(walletAddress), loadUserVotes(walletAddress)]).finally(
        () => setVotingPowerLoading(false)
      );
    }
  }, [walletAddress, loadVotingPower, loadUserVotes]);

  // Load proposals on mount
  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Governance</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Participate in decisions that shape the future of the protocol.
        </p>
      </div>

      {/* Voting Power Card */}
      <div className="mb-8">
        <VotingPowerCard
          votingPower={userVotingPower}
          loading={votingPowerLoading}
          walletAddress={walletAddress}
        />
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(['all', 'active', 'passed', 'failed', 'cancelled'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            aria-pressed={filter === f}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Proposals List */}
      <ProposalList
        proposals={proposals}
        loading={loading}
        error={error}
        filter={filter}
      />
    </main>
  );
}
