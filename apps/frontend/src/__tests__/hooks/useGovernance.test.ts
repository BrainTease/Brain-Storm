/* eslint-disable import/no-unresolved */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useGovernance } from '@/hooks/useGovernance';
import * as governanceApi from '@/lib/governanceApi';
import * as toast from '@/lib/toast';
import { Proposal, useGovernanceStore } from '@/store/governanceStore';

vi.mock('@/lib/governanceApi');
vi.mock('@/lib/toast');

const mockProposal: Proposal = {
  id: '1',
  title: 'Test Proposal',
  description: 'Test Description',
  status: 'active',
  createdAt: new Date().toISOString(),
  votingDeadline: new Date(Date.now() + 86400000).toISOString(),
  votesFor: 100,
  votesAgainst: 50,
  quorumRequired: 1000,
  votesRequired: 600,
  totalVotes: 150,
};

type MockedFn = ReturnType<typeof vi.fn>;

// eslint-disable-next-line max-lines-per-function
describe('useGovernance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useGovernanceStore.setState({
      proposals: [],
      selectedProposal: null,
      userVotingPower: null,
      userVotes: {},
      loading: false,
      error: null,
    });
  });

  it('returns governance hook with initial state', () => {
    const { result } = renderHook(() => useGovernance());
    expect(result.current.proposals).toEqual([]);
    expect(result.current.selectedProposal).toBeNull();
    expect(result.current.userVotingPower).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('loads proposals successfully', async () => {
    const mockProposals = [mockProposal];
    (governanceApi.fetchProposals as MockedFn).mockResolvedValue({
      ok: true,
      data: mockProposals,
    });

    const { result } = renderHook(() => useGovernance());

    await act(async () => {
      await result.current.loadProposals();
    });

    expect(result.current.proposals).toEqual(mockProposals);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles error when loading proposals fails', async () => {
    const errorMessage = 'Failed to fetch proposals';
    (governanceApi.fetchProposals as MockedFn).mockResolvedValue({
      ok: false,
      error: { message: errorMessage },
    });

    const { result } = renderHook(() => useGovernance());

    await act(async () => {
      await result.current.loadProposals();
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.proposals).toEqual([]);
    expect(toast.toast.error as MockedFn).toHaveBeenCalledWith(errorMessage);
  });

  it('loads single proposal by id', async () => {
    (governanceApi.fetchProposal as MockedFn).mockResolvedValue({
      ok: true,
      data: mockProposal,
    });

    const { result } = renderHook(() => useGovernance());

    await act(async () => {
      await result.current.loadProposal('1');
    });

    expect(result.current.selectedProposal).toEqual(mockProposal);
    expect(result.current.loading).toBe(false);
  });

  it('loads voting power for wallet address', async () => {
    const votingPower = 500;
    (governanceApi.fetchVotingPower as MockedFn).mockResolvedValue({
      ok: true,
      data: votingPower,
    });

    const { result } = renderHook(() => useGovernance());

    await act(async () => {
      await result.current.loadVotingPower('0x1234');
    });

    expect(result.current.userVotingPower).toBe(votingPower);
  });

  it('handles error when loading voting power fails', async () => {
    const errorMessage = 'Failed to fetch voting power';
    (governanceApi.fetchVotingPower as MockedFn).mockResolvedValue({
      ok: false,
      error: { message: errorMessage },
    });

    const { result } = renderHook(() => useGovernance());

    await act(async () => {
      await result.current.loadVotingPower('0x1234');
    });

    expect(result.current.userVotingPower).toBe(0);
    expect(toast.toast.error as MockedFn).toHaveBeenCalledWith(errorMessage);
  });

  it('loads user votes and records them', async () => {
    const mockVotes = [
      {
        proposalId: '1',
        voter: '0x1234',
        support: true,
        votingPower: 100,
        timestamp: new Date().toISOString(),
      },
    ];
    (governanceApi.fetchUserVotes as MockedFn).mockResolvedValue({
      ok: true,
      data: mockVotes,
    });

    const { result } = renderHook(() => useGovernance());

    await act(async () => {
      await result.current.loadUserVotes('0x1234');
    });

    expect(result.current.userVotes['1']).toBe(true);
  });

  it('checks if user has voted on a proposal', async () => {
    (governanceApi.hasVoted as MockedFn).mockResolvedValue({
      ok: true,
      data: true,
    });

    const { result } = renderHook(() => useGovernance());

    let voted = false;
    await act(async () => {
      voted = await result.current.checkHasVoted('1', '0x1234');
    });
    expect(voted).toBe(true);
  });

  it('casts a vote successfully', async () => {
    (governanceApi.submitVote as MockedFn).mockResolvedValue({
      ok: true,
      data: {},
    });

    const { result } = renderHook(() => useGovernance());

    let success = false;
    await act(async () => {
      success = await result.current.castVote('1', '0x1234', true, 'signed_tx_data');
    });
    expect(success).toBe(true);

    expect(result.current.userVotes['1']).toBe(true);
    expect(toast.toast.success as MockedFn).toHaveBeenCalled();
  });

  it('handles error when casting vote fails', async () => {
    const errorMessage = 'Failed to cast vote';
    (governanceApi.submitVote as MockedFn).mockResolvedValue({
      ok: false,
      error: { message: errorMessage },
    });

    const { result } = renderHook(() => useGovernance());

    let success = false;
    await act(async () => {
      success = await result.current.castVote('1', '0x1234', true, 'signed_tx_data');
    });
    expect(success).toBe(false);

    expect(toast.toast.error as MockedFn).toHaveBeenCalledWith(errorMessage);
  });

  it('clears governance state', () => {
    useGovernanceStore.setState({
      proposals: [mockProposal],
      selectedProposal: mockProposal,
      userVotingPower: 500,
    });

    const { result } = renderHook(() => useGovernance());

    act(() => {
      result.current.clearGovernance();
    });

    expect(result.current.proposals).toEqual([]);
    expect(result.current.selectedProposal).toBeNull();
  });
});
