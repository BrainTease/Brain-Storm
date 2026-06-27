import { create } from 'zustand';

export interface Proposal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'passed' | 'failed' | 'cancelled';
  createdAt: string;
  votingDeadline: string;
  votesFor: number;
  votesAgainst: number;
  quorumRequired: number;
  votesRequired: number;
  totalVotes: number;
}

export interface Vote {
  proposalId: string;
  voter: string;
  support: boolean;
  votingPower: number;
  timestamp: string;
}

interface GovernanceState {
  proposals: Proposal[];
  selectedProposal: Proposal | null;
  userVotingPower: number | null;
  userVotes: Record<string, boolean>; // proposalId -> hasVoted
  loading: boolean;
  error: string | null;
  setProposals: (proposals: Proposal[]) => void;
  setSelectedProposal: (proposal: Proposal | null) => void;
  setUserVotingPower: (power: number | null) => void;
  recordVote: (proposalId: string, support: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useGovernanceStore = create<GovernanceState>((set) => ({
  proposals: [],
  selectedProposal: null,
  userVotingPower: null,
  userVotes: {},
  loading: false,
  error: null,
  setProposals: (proposals) => set({ proposals }),
  setSelectedProposal: (selectedProposal) => set({ selectedProposal }),
  setUserVotingPower: (userVotingPower) => set({ userVotingPower }),
  recordVote: (proposalId, support) =>
    set((state) => ({
      userVotes: { ...state.userVotes, [proposalId]: support },
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({
    proposals: [],
    selectedProposal: null,
    userVotingPower: null,
    userVotes: {},
    loading: false,
    error: null,
  }),
}));
