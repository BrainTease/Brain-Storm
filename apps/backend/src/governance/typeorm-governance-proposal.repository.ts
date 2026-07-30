import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GovernanceProposal } from './governance-proposal.entity';
import { GovernanceProposalRepository } from './governance-proposal.repository.interface';

@Injectable()
export class TypeOrmGovernanceProposalRepository implements GovernanceProposalRepository {
  constructor(
    @InjectRepository(GovernanceProposal)
    private readonly repo: Repository<GovernanceProposal>
  ) {}

  async findAll(options: {
    status?: string;
    type?: string;
    proposerAddress?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: GovernanceProposal[]; total: number }> {
    const { status, type, proposerAddress, page = 1, limit = 20 } = options;

    const qb = this.repo.createQueryBuilder('proposal');

    if (status) {
      qb.andWhere('proposal.status = :status', { status });
    }
    if (type) {
      qb.andWhere('proposal.type = :type', { type });
    }
    if (proposerAddress) {
      qb.andWhere('proposal.proposerAddress = :proposerAddress', {
        proposerAddress,
      });
    }

    const total = await qb.clone().getCount();
    const data = await qb
      .orderBy('proposal.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { data, total };
  }

  async findById(id: string): Promise<GovernanceProposal | null> {
    return this.repo.findOne({ where: { id } });
  }

  async save(proposal: Partial<GovernanceProposal>): Promise<GovernanceProposal> {
    return this.repo.save(this.repo.create(proposal));
  }

  async update(id: string, patch: Partial<GovernanceProposal>): Promise<GovernanceProposal> {
    await this.repo.update(id, patch);
    return this.repo.findOneOrFail({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
