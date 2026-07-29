import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GovernanceProposalService } from './governance-proposal.service';
import {
  GOVERNANCE_PROPOSAL_REPOSITORY,
  GovernanceProposalRepository,
} from './governance-proposal.repository.interface';
import {
  GovernanceProposal,
  ProposalStatus,
  ProposalType,
} from './governance-proposal.entity';
import {
  CreateProposalDto,
  UpdateProposalDto,
  ProposalQueryDto,
  VoteDto,
} from './dto/governance-proposal.dto';
import { PaginatedResponseDto } from '../common/dto/api-response.dto';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeProposal(
  overrides: Partial<GovernanceProposal> = {},
): GovernanceProposal {
  return {
    id: 'prop-1',
    title: 'Test Proposal',
    description: 'A description',
    type: ProposalType.TEXT,
    status: ProposalStatus.DRAFT,
    proposerAddress: 'GABC1234',
    onChainId: null,
    votesFor: 0,
    votesAgainst: 0,
    quorumRequired: 3,
    metadata: null,
    votingStartsAt: null,
    votingEndsAt: null,
    executedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  } as GovernanceProposal;
}

// ─── In-memory mock repository ───────────────────────────────────────────────

function makeRepoMock(): jest.Mocked<GovernanceProposalRepository> {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
}

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('GovernanceProposalService', () => {
  let service: GovernanceProposalService;
  let repo: jest.Mocked<GovernanceProposalRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    repo = makeRepoMock();
    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovernanceProposalService,
        { provide: GOVERNANCE_PROPOSAL_REPOSITORY, useValue: repo },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<GovernanceProposalService>(GovernanceProposalService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return a PaginatedResponseDto with default page/limit', async () => {
      const proposals = [makeProposal()];
      repo.findAll.mockResolvedValue({ data: proposals, total: 1 });

      const result = await service.findAll({});

      expect(result).toBeInstanceOf(PaginatedResponseDto);
      expect(result.data).toEqual(proposals);
      expect(result.pagination).toMatchObject({ total: 1, page: 1, limit: 20 });
      expect(repo.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });

    it('should forward filters to the repository', async () => {
      repo.findAll.mockResolvedValue({ data: [], total: 0 });
      const query: ProposalQueryDto = { status: 'active', page: 2, limit: 5 };

      await service.findAll(query);

      expect(repo.findAll).toHaveBeenCalledWith({
        status: 'active',
        page: 2,
        limit: 5,
      });
    });

    it('should return an empty page when no proposals exist', async () => {
      repo.findAll.mockResolvedValue({ data: [], total: 0 });
      const result = await service.findAll({});
      expect(result.data).toHaveLength(0);
      expect(result.pagination!.totalPages).toBe(0);
    });
  });

  // ── findById ────────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return the proposal when found', async () => {
      const p = makeProposal();
      repo.findById.mockResolvedValue(p);

      const result = await service.findById('prop-1');
      expect(result).toBe(p);
    });

    it('should throw NotFoundException when the proposal does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto: CreateProposalDto = {
      title: 'New Proposal',
      description: 'Desc',
      proposerAddress: 'GXYZ',
      quorumRequired: 5,
    };

    it('should save and return a new DRAFT proposal', async () => {
      const saved = makeProposal({ title: dto.title });
      repo.save.mockResolvedValue(saved);

      const result = await service.create(dto);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: dto.title,
          status: ProposalStatus.DRAFT,
          quorumRequired: 5,
        }),
      );
      expect(result).toBe(saved);
    });

    it('should emit governance.proposal.created event', async () => {
      const saved = makeProposal();
      repo.save.mockResolvedValue(saved);

      await service.create(dto);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'governance.proposal.created',
        { proposalId: saved.id },
      );
    });

    it('should set quorumRequired to 0 when not provided', async () => {
      const noQuotaDto: CreateProposalDto = { ...dto };
      delete noQuotaDto.quorumRequired;
      const saved = makeProposal({ quorumRequired: 0 });
      repo.save.mockResolvedValue(saved);

      await service.create(noQuotaDto);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ quorumRequired: 0 }),
      );
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update a DRAFT proposal', async () => {
      const proposal = makeProposal();
      const updatedProposal = makeProposal({ title: 'Updated' });
      repo.findById.mockResolvedValue(proposal);
      repo.update.mockResolvedValue(updatedProposal);

      const result = await service.update('prop-1', { title: 'Updated' } as UpdateProposalDto);

      expect(repo.update).toHaveBeenCalledWith(
        'prop-1',
        expect.objectContaining({ title: 'Updated' }),
      );
      expect(result).toBe(updatedProposal);
    });

    it('should throw BadRequestException when updating a non-DRAFT proposal', async () => {
      repo.findById.mockResolvedValue(makeProposal({ status: ProposalStatus.ACTIVE }));

      await expect(
        service.update('prop-1', { title: 'x' } as UpdateProposalDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should preserve existing field values when partial dto is provided', async () => {
      const proposal = makeProposal({ description: 'original desc' });
      const updated = makeProposal({ description: 'original desc' });
      repo.findById.mockResolvedValue(proposal);
      repo.update.mockResolvedValue(updated);

      await service.update('prop-1', {} as UpdateProposalDto);

      expect(repo.update).toHaveBeenCalledWith(
        'prop-1',
        expect.objectContaining({ description: 'original desc' }),
      );
    });
  });

  // ── activate ─────────────────────────────────────────────────────────────────

  describe('activate', () => {
    it('should transition DRAFT → ACTIVE', async () => {
      repo.findById.mockResolvedValue(makeProposal({ status: ProposalStatus.DRAFT }));
      const activated = makeProposal({ status: ProposalStatus.ACTIVE });
      repo.update.mockResolvedValue(activated);

      const result = await service.activate('prop-1');

      expect(repo.update).toHaveBeenCalledWith('prop-1', {
        status: ProposalStatus.ACTIVE,
      });
      expect(result.status).toBe(ProposalStatus.ACTIVE);
    });

    it('should emit governance.proposal.activated event', async () => {
      repo.findById.mockResolvedValue(makeProposal());
      repo.update.mockResolvedValue(makeProposal({ status: ProposalStatus.ACTIVE }));

      await service.activate('prop-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'governance.proposal.activated',
        { proposalId: 'prop-1' },
      );
    });

    it('should throw when proposal is not in DRAFT status', async () => {
      repo.findById.mockResolvedValue(makeProposal({ status: ProposalStatus.ACTIVE }));

      await expect(service.activate('prop-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw when proposal is already EXECUTED', async () => {
      repo.findById.mockResolvedValue(makeProposal({ status: ProposalStatus.EXECUTED }));

      await expect(service.activate('prop-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── cancel ───────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('should cancel a DRAFT proposal', async () => {
      repo.findById.mockResolvedValue(makeProposal({ status: ProposalStatus.DRAFT }));
      const cancelled = makeProposal({ status: ProposalStatus.CANCELLED });
      repo.update.mockResolvedValue(cancelled);

      const result = await service.cancel('prop-1');
      expect(result.status).toBe(ProposalStatus.CANCELLED);
    });

    it('should cancel an ACTIVE proposal', async () => {
      repo.findById.mockResolvedValue(makeProposal({ status: ProposalStatus.ACTIVE }));
      repo.update.mockResolvedValue(makeProposal({ status: ProposalStatus.CANCELLED }));

      await expect(service.cancel('prop-1')).resolves.not.toThrow();
    });

    it('should throw when proposal is already EXECUTED', async () => {
      repo.findById.mockResolvedValue(makeProposal({ status: ProposalStatus.EXECUTED }));
      await expect(service.cancel('prop-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw when proposal is already REJECTED', async () => {
      repo.findById.mockResolvedValue(makeProposal({ status: ProposalStatus.REJECTED }));
      await expect(service.cancel('prop-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ── recordVote ──────────────────────────────────────────────────────────────

  describe('recordVote', () => {
    const voteFor: VoteDto = { voter: 'GABC', support: true };
    const voteAgainst: VoteDto = { voter: 'GXYZ', support: false };

    it('should increment votesFor when support=true', async () => {
      const active = makeProposal({ status: ProposalStatus.ACTIVE, votesFor: 0 });
      const afterVote = makeProposal({ status: ProposalStatus.ACTIVE, votesFor: 1 });
      repo.findById.mockResolvedValue(active);
      repo.update.mockResolvedValue(afterVote);

      const result = await service.recordVote('prop-1', voteFor);

      expect(repo.update).toHaveBeenCalledWith('prop-1', { votesFor: 1 });
      expect(result.votesFor).toBe(1);
    });

    it('should increment votesAgainst when support=false', async () => {
      const active = makeProposal({ status: ProposalStatus.ACTIVE, votesAgainst: 2 });
      const afterVote = makeProposal({ status: ProposalStatus.ACTIVE, votesAgainst: 3 });
      repo.findById.mockResolvedValue(active);
      repo.update.mockResolvedValue(afterVote);

      await service.recordVote('prop-1', voteAgainst);

      expect(repo.update).toHaveBeenCalledWith('prop-1', { votesAgainst: 3 });
    });

    it('should emit governance.proposal.voted event', async () => {
      repo.findById.mockResolvedValue(makeProposal({ status: ProposalStatus.ACTIVE }));
      repo.update.mockResolvedValue(makeProposal({ status: ProposalStatus.ACTIVE }));

      await service.recordVote('prop-1', voteFor);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'governance.proposal.voted',
        { proposalId: 'prop-1', voter: 'GABC', support: true },
      );
    });

    it('should throw when proposal is not ACTIVE', async () => {
      repo.findById.mockResolvedValue(makeProposal({ status: ProposalStatus.DRAFT }));
      await expect(service.recordVote('prop-1', voteFor)).rejects.toThrow(BadRequestException);
    });

    it('should throw when the voting period has ended', async () => {
      const pastDate = new Date(Date.now() - 1000);
      repo.findById.mockResolvedValue(
        makeProposal({ status: ProposalStatus.ACTIVE, votingEndsAt: pastDate }),
      );
      await expect(service.recordVote('prop-1', voteFor)).rejects.toThrow(BadRequestException);
    });
  });

  // ── execute ──────────────────────────────────────────────────────────────────

  describe('execute', () => {
    it('should set status to EXECUTED when quorum met and majority votes for', async () => {
      const active = makeProposal({
        status: ProposalStatus.ACTIVE,
        votesFor: 4,
        votesAgainst: 1,
        quorumRequired: 3,
      });
      const executed = makeProposal({ status: ProposalStatus.EXECUTED });
      repo.findById.mockResolvedValue(active);
      repo.update.mockResolvedValue(executed);

      const result = await service.execute('prop-1');

      expect(repo.update).toHaveBeenCalledWith(
        'prop-1',
        expect.objectContaining({ status: ProposalStatus.EXECUTED }),
      );
      expect(result.status).toBe(ProposalStatus.EXECUTED);
    });

    it('should set status to REJECTED when majority votes against', async () => {
      const active = makeProposal({
        status: ProposalStatus.ACTIVE,
        votesFor: 1,
        votesAgainst: 4,
        quorumRequired: 3,
      });
      const rejected = makeProposal({ status: ProposalStatus.REJECTED });
      repo.findById.mockResolvedValue(active);
      repo.update.mockResolvedValue(rejected);

      const result = await service.execute('prop-1');

      expect(repo.update).toHaveBeenCalledWith(
        'prop-1',
        expect.objectContaining({ status: ProposalStatus.REJECTED }),
      );
      expect(result.status).toBe(ProposalStatus.REJECTED);
    });

    it('should throw when quorum is not met', async () => {
      const active = makeProposal({
        status: ProposalStatus.ACTIVE,
        votesFor: 1,
        votesAgainst: 0,
        quorumRequired: 10,
      });
      repo.findById.mockResolvedValue(active);

      await expect(service.execute('prop-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw when proposal is not ACTIVE', async () => {
      repo.findById.mockResolvedValue(makeProposal({ status: ProposalStatus.DRAFT }));
      await expect(service.execute('prop-1')).rejects.toThrow(BadRequestException);
    });

    it('should emit governance.proposal.executed event when passed', async () => {
      repo.findById.mockResolvedValue(
        makeProposal({ status: ProposalStatus.ACTIVE, votesFor: 5, votesAgainst: 0, quorumRequired: 3 }),
      );
      repo.update.mockResolvedValue(makeProposal({ status: ProposalStatus.EXECUTED }));

      await service.execute('prop-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'governance.proposal.executed',
        { proposalId: 'prop-1' },
      );
    });

    it('should emit governance.proposal.rejected event when failed', async () => {
      repo.findById.mockResolvedValue(
        makeProposal({ status: ProposalStatus.ACTIVE, votesFor: 0, votesAgainst: 5, quorumRequired: 3 }),
      );
      repo.update.mockResolvedValue(makeProposal({ status: ProposalStatus.REJECTED }));

      await service.execute('prop-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'governance.proposal.rejected',
        { proposalId: 'prop-1' },
      );
    });
  });

  // ── getStats ─────────────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should return correct vote statistics', async () => {
      repo.findById.mockResolvedValue(
        makeProposal({ votesFor: 7, votesAgainst: 3, quorumRequired: 5 }),
      );

      const stats = await service.getStats('prop-1');

      expect(stats).toEqual({
        votesFor: 7,
        votesAgainst: 3,
        quorum: 10,
        quorumRequired: 5,
        totalVoters: 10,
      });
    });

    it('should return zeros when no votes have been cast', async () => {
      repo.findById.mockResolvedValue(
        makeProposal({ votesFor: 0, votesAgainst: 0, quorumRequired: 3 }),
      );

      const stats = await service.getStats('prop-1');

      expect(stats.totalVoters).toBe(0);
      expect(stats.quorum).toBe(0);
    });

    it('should throw NotFoundException for unknown id', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.getStats('nope')).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete a known proposal', async () => {
      repo.findById.mockResolvedValue(makeProposal());
      repo.remove.mockResolvedValue(undefined);

      await service.remove('prop-1');

      expect(repo.remove).toHaveBeenCalledWith('prop-1');
    });

    it('should throw NotFoundException for an unknown proposal', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.remove('ghost')).rejects.toThrow(NotFoundException);
    });
  });
});
