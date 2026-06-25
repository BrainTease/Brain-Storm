'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWalletStore } from '@/store/walletStore';
import { useGovernance } from '@/hooks/useGovernance';
import { ProposalDetail } from '@/components/governance';
import { toast } from '@/lib/toast';

export default function ProposalPage() {
  const params = useParams();
  const router = useRouter();
  const proposalId = params.id as string;

  const { address: walletAddress } = useWalletStore();
  const {
    selectedProposal,
    userVotingPower,
    loading,
    loadProposal,
    checkHasVoted,
    castVote,
  } = useGovernance();

  const [votingInProgress, setVotingInProgress] = useState(false);
  const [hasUserVoted, setHasUserVoted] = useState(false);

  // Load proposal on mount
  useEffect(() => {
    if (proposalId) {
      loadProposal(proposalId);
    }
  }, [proposalId, loadProposal]);

  // Check if user has voted
  useEffect(() => {
    if (proposalId && walletAddress) {
      checkHasVoted(proposalId, walletAddress).then(setHasUserVoted);
    } else {
      setHasUserVoted(false);
    }
  }, [proposalId, walletAddress, checkHasVoted]);

  const handleVote = async (support: boolean) => {
    if (!walletAddress) {
      toast.error('Please connect your wallet to vote');
      return;
    }

    if (!selectedProposal) {
      toast.error('Proposal not found');
      return;
    }

    setVotingInProgress(true);
    try {
      // In a real implementation, this would sign a transaction with the wallet
      // For now, we'll use a placeholder transaction
      const signedTransaction = `signed-tx-${Date.now()}`;

      const success = await castVote(
        proposalId,
        walletAddress,
        support,
        signedTransaction
      );

      if (success) {
        setHasUserVoted(true);
        // Reload proposal to get updated vote counts
        setTimeout(() => loadProposal(proposalId), 1000);
      }
    } finally {
      setVotingInProgress(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
        >
          ← Back to Proposals
        </button>
      </div>

      {/* Proposal Content */}
      <ProposalDetail
        proposal={selectedProposal}
        loading={loading}
        userVotingPower={userVotingPower}
        hasUserVoted={hasUserVoted}
        onVote={handleVote}
        votingDisabled={votingInProgress}
      />
    </main>
  );
}
