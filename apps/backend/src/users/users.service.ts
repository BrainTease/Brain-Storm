import { Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { ImportJob, ImportJobStatus, ImportJobType } from '../import-export/import-job.entity';
import { UserQueryDto } from './dto/user-query.dto';
import { PaginatedResponseDto } from '../common/dto/api-response.dto';
import { USERS_REPOSITORY_TOKEN, UsersRepository } from '../repositories';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(USERS_REPOSITORY_TOKEN) private readonly usersRepository: UsersRepository,
    @InjectRepository(ImportJob) private importJobRepo: Repository<ImportJob>
  ) {}

  findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  findByVerificationToken(hash: string) {
    return this.usersRepository.findByVerificationToken(hash);
  }

  findById(id: string) {
    return this.usersRepository.findById(id);
  }

  findByStellarPublicKey(stellarPublicKey: string) {
    return this.usersRepository.findByStellarPublicKey(stellarPublicKey);
  }

  create(data: Partial<User>) {
    return this.usersRepository.save(data);
  }

  async update(id: string, data: Partial<User>) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.usersRepository.save({ ...user, ...data });
  }

  canUpdateUser(currentUserId: string, targetUserId: string, currentUserRole?: string): boolean {
    return currentUserId === targetUserId || currentUserRole === 'admin';
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // In production, upload to S3/CDN and return URL
    // For now, return a placeholder
    const avatarUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    await this.usersRepository.save({ ...user, avatar: avatarUrl });
    return { avatarUrl };
  }

  async findAll(options: UserQueryDto = {}): Promise<PaginatedResponseDto<User>> {
    const { page = 1, limit = 20, role, isVerified, search } = options;

    const result = await this.usersRepository.findAll({ page, limit, role, isVerified, search });

    return new PaginatedResponseDto(result.data, 200, page, limit, result.meta.total);
  }

  async banUser(id: string, isBanned: boolean) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.usersRepository.save({ ...user, isBanned });
  }

  async changeRole(id: string, role: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.usersRepository.save({ ...user, role });
  }

  async softDelete(id: string) {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.usersRepository.save({ ...user, deletedAt: new Date() });
  }

  findByReferralCode(code: string) {
    return this.usersRepository.findByReferralCode(code);
  }

  async getReferralStats(userId: string) {
    const count = await this.usersRepository.countReferredBy(userId);
    return { referralCount: count, earnedBst: count * 50 };
  }

  async findImportJob(jobId: string): Promise<ImportJob> {
    const job = await this.importJobRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Import job not found');
    }
    return job;
  }

  async bulkImportUsersCsv(buffer: Buffer, adminId: string): Promise<ImportJob> {
    const rows = this.parseCsv(buffer);
    const job = await this.importJobRepo.save(
      this.importJobRepo.create({
        instructorId: adminId,
        type: ImportJobType.USER,
        status: ImportJobStatus.PENDING,
        total: rows.length,
        processed: 0,
        result: {},
      })
    );

    this.processUserImportJob(job.id, rows).catch((err) => {
      this.logger.error(`Bulk user import job failed: ${err?.message ?? err}`);
    });

    return job;
  }

  private async processUserImportJob(jobId: string, rows: Record<string, string>[]) {
    await this.importJobRepo.update(jobId, { status: ImportJobStatus.PROCESSING });
    const results: Record<string, unknown> = {};
    let processed = 0;

    for (const row of rows) {
      try {
        await this.createUserFromCsvRow(row);
        results[row.email || `row-${processed + 1}`] = { success: true };
      } catch (err: unknown) {
        results[row.email || `row-${processed + 1}`] = {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
      processed += 1;
      await this.importJobRepo.update(jobId, { processed, result: results });
    }

    await this.importJobRepo.update(jobId, {
      status: ImportJobStatus.DONE,
      result: results,
    });
  }

  private parseCsv(buffer: Buffer): Record<string, string>[] {
    const text = buffer.toString('utf-8').trim();
    if (!text) return [];

    const [headerLine, ...lines] = text.split(/\r?\n/);
    const headers = headerLine.split(',').map((value) => value.trim());

    return lines.filter(Boolean).map((line) => {
      const cols = line.split(',').map((value) => value.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = cols[index] ?? '';
      });
      return row;
    });
  }

  private async createUserFromCsvRow(row: Record<string, string>) {
    const email = (row.email || '').trim();
    if (!email) {
      throw new Error('Each row must contain an email');
    }

    const existing = await this.findByEmail(email);
    if (existing) {
      throw new Error(`User already exists: ${email}`);
    }

    const passwordHash = await bcrypt.hash(Math.random().toString(36).slice(2), 10);
    await this.usersRepository.save({
      email,
      username: row.username?.trim() || undefined,
      role: row.role?.trim() || 'student',
      isVerified: row.isVerified?.trim().toLowerCase() === 'true',
      referralCode: row.referralCode?.trim() || undefined,
      passwordHash,
    });
  }
}
