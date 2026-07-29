import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  GovernanceProposalRepository,
  GOVERNANCE_PROPOSAL_REPOSITORY,
} from './governance-proposal.repository.interface';
import { GovernanceProposal, ProposalStatus } from './governance-proposal.entity';
import {
  CreateProposalDto,
  UpdateProposalDto,
  ProposalQueryDto,
  VoteDto,
} from './dto/governance-proposal.dto';
import { PaginatedResponseDto } from '../common/dto/api-response.dto';

/**
 * GovernanceProposalService
 *
 * All database access is delegated to GovernanceProposalRepository, injected
 * via the GOVERNANCE_PROPOSAL_REPOSITORY token.  This makes the service fully
 * testable in isolation — unit tests supply an in-memory mock without hitting
 * a real database.
 *
 * Responsibilities:
 *  - CRUD for proposals
 *  - Lifecycle transitions (activate → pass/reject/execute/cancel)
 *  - Vote counting (on-chain vote tallying is handled by the Soroban contract;
 *    this service mirrors the tallied totals for API consumers)
 *  - Emitting domain events so other modules can react
 */
@Injectable()
export class GovernanceProposalService {
  constructor(
    @Inject(GOVERNANCE_PROPOSAL_REPOSITORY)
    private readonly proposalRepo: GovernanceProposalRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── Query ─────────────────────────────────────────────────────────────────

  async findAll(query: ProposalQueryDto = {}): Promise<PaginatedResponseDto<GovernanceProposal>> {
    const { page = 1, limit = 20, ...filters } = query;
    const { data, total } = await this.proposalRepo.findAll({ page, limit, ...filters });
    return new PaginatedResponseDto(data, 200, page, limit, total);
  }

  async findById(id: string): Promise<GovernanceProposal> {
    const proposal = await this.proposalRepo.findById(id);
    if (!proposal) {
      throw new NotFoundException(`Governance proposal '${id}' not found`);
    }
    return proposal;
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async create(dto: CreateProposalDto): Promise<GovernanceProposal> {
    const proposal = await this.proposalRepo.save({
      title: dto.title,
      description: dto.description,
      type: dto.type,
      proposerAddress: dto.proposerAddress,
      quorumRequired: dto.quorumRequired ?? 0,
      votingStartsAt: dto.votingStartsAt ? new Date(dto.votingStartsAt) : undefined,
      votingEndsAt: dto.votingEndsAt ? new Date(dto.votingEndsAt) : undefined,
      metadata: dto.metadata,
      status: ProposalStatus.DRAFT,
    });

    this.eventEmitter.emit('governance.proposal.created', { proposalId: proposal.id });
    return proposal;
  }

  async update(id: string, dto: UpdateProposalDto): Promise<GovernanceProposal> {
    const existing = await this.findById(id);

    if (existing.status !== ProposalStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft proposals can be edited',
      );
    }

    return this.proposalRepo.update(id, {
      title: dto.title ?? existing.title,
      description: dto.description ?? existing.description,
      metadata: dto.metadata ?? existing.metadata,
    });
  }

  async activate(id: string): Promise<GovernanceProposal> {
    const proposal = await this.findById(id);

    if (proposal.status !== ProposalStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot activate a proposal in status '${proposal.status}'`,
      );
    }

    const updated = await this.proposalRepo.update(id, {
      status: ProposalStatus.ACTIVE,
    });

    this.eventEmitter.emit('governance.proposal.activated', { proposalId: id });
    return updated;
  }

  async cancel(id: string): Promise<GovernanceProposal> {
    const proposal = await this.findById(id);

    const cancellableStatuses: ProposalStatus[] = [
      ProposalStatus.DRAFT,
      ProposalStatus.ACTIVE,
    ];

    if (!cancellableStatuses.includes(proposal.status)) {
      throw new BadRequestException(
        `Cannot cancel a proposal in status '${proposal.status}'`,
      );
    }

    return this.proposalRepo.update(id, { status: ProposalStatus.CANCELLED });
  }

  async recordVote(id: string, dto: VoteDto): Promise<GovernanceProposal> {
    const proposal = await this.findById(id);

    if (proposal.status !== ProposalStatus.ACTIVE) {
      throw new BadRequestException('Voting is only allowed on active proposals');
    }

    if (proposal.votingEndsAt && proposal.votingEndsAt < new Date()) {
      throw new BadRequestException('Voting period has ended');
    }

    const patch: Partial<GovernanceProposal> = dto.support
      ? { votesFor: proposal.votesFor + 1 }
      : { votesAgainst: proposal.votesAgainst + 1 };

    const updated = await this.proposalRepo.update(id, patch);

    this.eventEmitter.emit('governance.proposal.voted', {
      proposalId: id,
      voter: dto.voter,
      support: dto.support,
    });

    return updated;
  }

  async execute(id: string): Promise<GovernanceProposal> {
    const proposal = await this.findById(id);

    if (proposal.status !== ProposalStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot execute a proposal in status '${proposal.status}'`,
      );
    }

    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    const quorumMet = totalVotes >= proposal.quorumRequired;

    if (!quorumMet) {
      throw new BadRequestException(
        `Quorum not reached: ${totalVotes} votes cast, ${proposal.quorumRequired} required`,
      );
    }

    const passed = proposal.votesFor > proposal.votesAgainst;
    const newStatus = passed ? ProposalStatus.EXECUTED : ProposalStatus.REJECTED;

    const updated = await this.proposalRepo.update(id, {
      status: newStatus,
      executedAt: new Date(),
    });

    this.eventEmitter.emit(`governance.proposal.${passed ? 'executed' : 'rejected'}`, {
      proposalId: id,
    });

    return updated;
  }

  async getStats(id: string): Promise<{
    votesFor: number;
    votesAgainst: number;
    quorum: number;
    quorumRequired: number;
    totalVoters: number;
  }> {
    const proposal = await this.findById(id);
    const total = proposal.votesFor + proposal.votesAgainst;
    return {
      votesFor: proposal.votesFor,
      votesAgainst: proposal.votesAgainst,
      quorum: total,
      quorumRequired: proposal.quorumRequired,
      totalVoters: total,
    };
  }

  async remove(id: string): Promise<void> {
    await this.findById(id); // throws if not found
    await this.proposalRepo.remove(id);
  }
}
