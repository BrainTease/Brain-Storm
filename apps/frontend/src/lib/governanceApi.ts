/**
 * Governance API — migrated to typed apiClient (#969)
 *
 * All public functions now return `ApiResult<T>` instead of throwing.
 * Callers check `.ok` before using `.data`.
 */

import apiClient, { type ApiResult } from './apiClient';
import type { Proposal, Vote } from '@/store/governanceStore';

const GOVERNANCE_BASE = '/governance';

/**
 * Fetch all proposals with optional filtering and pagination
 */
export async function fetchProposals(
  status?: string,
  page: number = 1,
  limit: number = 10
): Promise<ApiResult<Proposal[]>> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  return apiClient.get<Proposal[]>(`${GOVERNANCE_BASE}/proposals?${params}`);
}

/**
 * Fetch a single proposal by ID
 */
export async function fetchProposal(proposalId: string): Promise<ApiResult<Proposal>> {
  return apiClient.get<Proposal>(`${GOVERNANCE_BASE}/proposals/${proposalId}`);
}

/**
 * Fetch voting power for a wallet address
 */
export async function fetchVotingPower(walletAddress: string): Promise<ApiResult<number>> {
  const result = await apiClient.get<{ votingPower: number }>(
    `${GOVERNANCE_BASE}/voting-power/${walletAddress}`
  );
  if (!result.ok) return result;
  return { ok: true, data: result.data.votingPower };
}

/**
 * Fetch user's historical votes
 */
export async function fetchUserVotes(walletAddress: string): Promise<ApiResult<Vote[]>> {
  return apiClient.get<Vote[]>(`${GOVERNANCE_BASE}/votes/${walletAddress}`);
}

/**
 * Submit a signed vote for a proposal
 */
export async function submitVote(
  proposalId: string,
  walletAddress: string,
  support: boolean,
  signedTransaction: string
): Promise<ApiResult<Vote>> {
  return apiClient.post<Vote>(`${GOVERNANCE_BASE}/proposals/${proposalId}/vote`, {
    voter: walletAddress,
    support,
    signedTransaction,
  });
}

/**
 * Fetch proposal voting stats
 */
export async function fetchProposalStats(proposalId: string): Promise<
  ApiResult<{
    votesFor: number;
    votesAgainst: number;
    quorum: number;
    quorumRequired: number;
    totalVoters: number;
  }>
> {
  return apiClient.get(`${GOVERNANCE_BASE}/proposals/${proposalId}/stats`);
}

/**
 * Check if wallet has already voted on proposal
 */
export async function hasVoted(
  proposalId: string,
  walletAddress: string
): Promise<ApiResult<boolean>> {
  const result = await apiClient.get<{ hasVoted: boolean }>(
    `${GOVERNANCE_BASE}/proposals/${proposalId}/voted/${walletAddress}`
  );
  if (!result.ok) return result;
  return { ok: true, data: result.data.hasVoted };
}
