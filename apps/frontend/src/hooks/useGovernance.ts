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
    const result = await fetchProposals(status);
    if (!result.ok) {
      setError(result.error.message);
      toast.error(result.error.message);
    } else {
      setProposals(result.data);
    }
    setLoading(false);
  };

  /**
   * Load single proposal details
   */
  const loadProposal = async (proposalId: string) => {
    setLoading(true);
    setError(null);
    const result = await fetchProposal(proposalId);
    if (!result.ok) {
      setError(result.error.message);
      toast.error(result.error.message);
    } else {
      setSelectedProposal(result.data);
    }
    setLoading(false);
  };

  /**
   * Load voting power for wallet
   */
  const loadVotingPower = async (walletAddress: string) => {
    const result = await fetchVotingPower(walletAddress);
    if (!result.ok) {
      toast.error(result.error.message);
      setUserVotingPower(0);
      return 0;
    }
    setUserVotingPower(result.data);
    return result.data;
  };

  /**
   * Load user's previous votes
   */
  const loadUserVotes = async (walletAddress: string) => {
    const result = await fetchUserVotes(walletAddress);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    result.data.forEach((vote) => {
      recordVote(vote.proposalId, vote.support);
    });
  };

  /**
   * Check if user has voted on a specific proposal
   */
  const checkHasVoted = async (proposalId: string, walletAddress: string): Promise<boolean> => {
    const result = await hasVoted(proposalId, walletAddress);
    return result.ok ? result.data : false;
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
    setLoading(true);
    const result = await submitVote(proposalId, walletAddress, support, signedTransaction);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error.message);
      return false;
    }
    recordVote(proposalId, support);
    toast.success(support ? 'Vote cast in favor!' : 'Vote cast against!');
    return true;
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
