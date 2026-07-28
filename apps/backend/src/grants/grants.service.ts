import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Grant } from './grant.entity';
import { CreateGrantDto, UpdateGrantDto, PaginateGrantsDto } from './dto/grant.dto';

export interface PaginatedGrants {
  data: Grant[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class GrantsService {
  constructor(
    @InjectRepository(Grant)
    private readonly grantsRepo: Repository<Grant>,
  ) {}

  async create(dto: CreateGrantDto): Promise<Grant> {
    const grant = this.grantsRepo.create({
      ...dto,
      currency: dto.currency ?? 'USD',
      status: 'open',
    });
    return this.grantsRepo.save(grant);
  }

  async findAll(query: PaginateGrantsDto): Promise<PaginatedGrants> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Partial<Grant> = {};
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await this.grantsRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Grant> {
    const grant = await this.grantsRepo.findOne({ where: { id } });
    if (!grant) {
      throw new NotFoundException(`Grant with id "${id}" not found`);
    }
    return grant;
  }

  async update(id: string, dto: UpdateGrantDto, requesterId: string): Promise<Grant> {
    const grant = await this.findOne(id);

    // Only the original applicant or a reviewer may update
    if (grant.applicantId !== requesterId && grant.reviewerId !== requesterId) {
      const isStatusUpdate = dto.status !== undefined || dto.reviewNotes !== undefined || dto.reviewerId !== undefined;
      if (!isStatusUpdate) {
        throw new ForbiddenException('You do not have permission to update this grant');
      }
    }

    Object.assign(grant, dto);
    return this.grantsRepo.save(grant);
  }

  async remove(id: string): Promise<void> {
    const grant = await this.findOne(id);
    await this.grantsRepo.remove(grant);
  }
}
