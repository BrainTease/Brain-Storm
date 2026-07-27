import api from './api';
import { Proposal, Vote } from '@/store/governanceStore';

const GOVERNANCE_BASE = '/governance';

/**
 * Fetch all proposals with optional filtering and pagination
 */
export async function fetchProposals(status?: string, page: number = 1, limit: number = 10): Promise<Proposal[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const response = await api.get<Proposal[]>(`${GOVERNANCE_BASE}/proposals?${params}`);
  return response.data;
}

/**
 * Fetch a single proposal by ID
 */
export async function fetchProposal(proposalId: string): Promise<Proposal> {
  const response = await api.get<Proposal>(`${GOVERNANCE_BASE}/proposals/${proposalId}`);
  return response.data;
}

/**
 * Fetch voting power for a wallet address
 */
export async function fetchVotingPower(walletAddress: string): Promise<number> {
  const response = await api.get<{ votingPower: number }>(
    `${GOVERNANCE_BASE}/voting-power/${walletAddress}`
  );
  return response.data.votingPower;
}

/**
 * Fetch user's historical votes
 */
export async function fetchUserVotes(walletAddress: string): Promise<Vote[]> {
  const response = await api.get<Vote[]>(`${GOVERNANCE_BASE}/votes/${walletAddress}`);
  return response.data;
}

/**
 * Submit a signed vote for a proposal
 */
export async function submitVote(
  proposalId: string,
  walletAddress: string,
  support: boolean,
  signedTransaction: string
): Promise<Vote> {
  const response = await api.post<Vote>(`${GOVERNANCE_BASE}/proposals/${proposalId}/vote`, {
    voter: walletAddress,
    support,
    signedTransaction,
  });
  return response.data;
}

/**
 * Fetch proposal voting stats
 */
export async function fetchProposalStats(proposalId: string): Promise<{
  votesFor: number;
  votesAgainst: number;
  quorum: number;
  quorumRequired: number;
  totalVoters: number;
}> {
  const response = await api.get(
    `${GOVERNANCE_BASE}/proposals/${proposalId}/stats`
  );
  return response.data;
}

/**
 * Check if wallet has already voted on proposal
 */
export async function hasVoted(proposalId: string, walletAddress: string): Promise<boolean> {
  const response = await api.get<{ hasVoted: boolean }>(
    `${GOVERNANCE_BASE}/proposals/${proposalId}/voted/${walletAddress}`
  );
  return response.data.hasVoted;
}
