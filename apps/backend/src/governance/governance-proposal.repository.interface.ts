import { GovernanceProposal, ProposalStatus } from './governance-proposal.entity';

/**
 * Repository abstraction for GovernanceProposal.
 * Using an interface as the seam lets us swap the real TypeORM implementation
 * for a lightweight in-memory mock in unit tests — no database required.
 */
export interface GovernanceProposalRepository {
  findAll(options: {
    status?: string;
    type?: string;
    proposerAddress?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: GovernanceProposal[]; total: number }>;

  findById(id: string): Promise<GovernanceProposal | null>;

  save(proposal: Partial<GovernanceProposal>): Promise<GovernanceProposal>;

  update(id: string, patch: Partial<GovernanceProposal>): Promise<GovernanceProposal>;

  remove(id: string): Promise<void>;
}

export const GOVERNANCE_PROPOSAL_REPOSITORY = Symbol('GOVERNANCE_PROPOSAL_REPOSITORY');
