/**
 * #809 — Grants: Persistence Layer
 *
 * Handles all database operations (CRUD) for grants.  Domain rules and
 * authorisation logic live in `GrantsBusinessService` so they can be tested
 * independently of the database.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Grant } from './grant.entity';
import { CreateGrantDto, UpdateGrantDto, PaginateGrantsDto } from './dto/grant.dto';
import { GrantsBusinessService } from './grants-business.service';
import type { PaginatedGrants } from '@brain-storm/types';

export type { PaginatedGrants } from '@brain-storm/types';

@Injectable()
export class GrantsService {
  constructor(
    @InjectRepository(Grant)
    private readonly grantsRepo: Repository<Grant>,
    private readonly businessService: GrantsBusinessService
  ) {}

  async create(dto: CreateGrantDto): Promise<Grant> {
    const defaults = this.businessService.applyCreateDefaults({ ...dto });
    const grant = this.grantsRepo.create(defaults as Grant);
    return this.grantsRepo.save(grant);
  }

  async findAll(query: PaginateGrantsDto): Promise<PaginatedGrants> {
    const { page, limit, skip } = this.businessService.resolvePagination(query.page, query.limit);

    const where: FindOptionsWhere<Grant> = {};
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

    // Business rule: authorisation check
    this.businessService.assertUpdatePermission(grant, dto, requesterId);

    Object.assign(grant, dto);
    return this.grantsRepo.save(grant);
  }

  async remove(id: string): Promise<void> {
    const grant = await this.findOne(id);
    await this.grantsRepo.remove(grant);
  }
}
