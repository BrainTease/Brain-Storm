'use client';

import { useGovernanceStore } from '@/store/governanceStore';
import {
  fetchProposals,
  fetchProposal,
  fetchVotingPower,
  fetchUserVotes,
  submitVote,
  hasVoted,
} from '@/lib/governanceApi';
import { toast } from '@/lib/toast';

export function useGovernance() {
  const {
    proposals,
    selectedProposal,
    userVotingPower,
    userVotes,
    loading,
    error,
    setProposals,
    setSelectedProposal,
    setUserVotingPower,
    recordVote,
    setLoading,
    setError,
    reset,
  } = useGovernanceStore();

  /**
   * Load all proposals
   */
  const loadProposals = async (status?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProposals(status);
      setProposals(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load proposals';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load single proposal details
   */
  const loadProposal = async (proposalId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProposal(proposalId);
      setSelectedProposal(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load proposal';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load voting power for wallet
   */
  const loadVotingPower = async (walletAddress: string) => {
    try {
      const power = await fetchVotingPower(walletAddress);
      setUserVotingPower(power);
      return power;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load voting power';
      toast.error(message);
      setUserVotingPower(0);
      return 0;
    }
  };

  /**
   * Load user's previous votes
   */
  const loadUserVotes = async (walletAddress: string) => {
    try {
      const votes = await fetchUserVotes(walletAddress);
      votes.forEach((vote) => {
        recordVote(vote.proposalId, vote.support);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load voting history';
      toast.error(message);
    }
  };

  /**
   * Check if user has voted on a specific proposal
   */
  const checkHasVoted = async (proposalId: string, walletAddress: string): Promise<boolean> => {
    try {
      return await hasVoted(proposalId, walletAddress);
    } catch (err) {
      console.error('Error checking vote status:', err);
      return false;
    }
  };

  /**
   * Submit a vote
   */
  const castVote = async (
    proposalId: string,
    walletAddress: string,
    support: boolean,
    signedTransaction: string
  ) => {
    try {
      setLoading(true);
      await submitVote(proposalId, walletAddress, support, signedTransaction);
      recordVote(proposalId, support);

      toast.success(support ? 'Vote cast in favor!' : 'Vote cast against!');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit vote';
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear governance state
   */
  const clearGovernance = () => {
    reset();
  };

  return {
    // State
    proposals,
    selectedProposal,
    userVotingPower,
    userVotes,
    loading,
    error,

    // Actions
    loadProposals,
    loadProposal,
    loadVotingPower,
    loadUserVotes,
    checkHasVoted,
    castVote,
    clearGovernance,
  };
}
