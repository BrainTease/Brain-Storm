/**
 * Jobs service — Issue #648
 * Job posting, application workflow, skill matching, auto-expiry, notifications.
 */
import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, LessThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Job, JobApplication, JobStatus, ApplicationStatus } from './job.entity';
import { CreateJobDto, UpdateJobDto, CreateApplicationDto, UpdateApplicationStatusDto, JobQueryDto } from './dto';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job) private jobRepo: Repository<Job>,
    @InjectRepository(JobApplication) private appRepo: Repository<JobApplication>,
    private events: EventEmitter2,
  ) {}

  // ── Jobs ─────────────────────────────────────────────────────────────────

  async createJob(userId: string, dto: CreateJobDto): Promise<Job> {
    const job = this.jobRepo.create({
      ...dto,
      instructorId: userId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
    const saved = await this.jobRepo.save(job);
    this.events.emit('job.created', { jobId: saved.id, userId });
    return saved;
  }

  async findAll(query: JobQueryDto) {
    const { search, category, status = JobStatus.OPEN, page = 1, limit = 20 } = query;
    const where: any = { status, isDeleted: false };
    if (category) where.category = category;
    if (search) where.title = ILike(`%${search}%`);

    const [data, total] = await this.jobRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['instructor'],
    });
    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.jobRepo.findOne({ where: { id, isDeleted: false }, relations: ['instructor', 'applications'] });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async update(id: string, userId: string, dto: UpdateJobDto): Promise<Job> {
    const job = await this.findOne(id);
    if (job.instructorId !== userId) throw new ForbiddenException('Not your job');
    Object.assign(job, dto);
    if (dto.expiresAt) job.expiresAt = new Date(dto.expiresAt);
    return this.jobRepo.save(job);
  }

  async remove(id: string, userId: string): Promise<void> {
    const job = await this.findOne(id);
    if (job.instructorId !== userId) throw new ForbiddenException('Not your job');
    job.isDeleted = true;
    await this.jobRepo.save(job);
  }

  // ── Applications ──────────────────────────────────────────────────────────

  async apply(jobId: string, userId: string, dto: CreateApplicationDto): Promise<JobApplication> {
    const job = await this.findOne(jobId);
    if (job.status !== JobStatus.OPEN) throw new ConflictException('Job is not open');
    if (job.instructorId === userId) throw new ForbiddenException('Cannot apply to own job');

    const existing = await this.appRepo.findOne({ where: { jobId, applicantId: userId } });
    if (existing) throw new ConflictException('Already applied');

    const app = this.appRepo.create({ jobId, applicantId: userId, coverLetter: dto.coverLetter });
    const saved = await this.appRepo.save(app);
    this.events.emit('job.application.submitted', { jobId, applicantId: userId, applicationId: saved.id });
    return saved;
  }

  async getApplicationsForJob(jobId: string, userId: string) {
    const job = await this.findOne(jobId);
    if (job.instructorId !== userId) throw new ForbiddenException('Not your job');
    return this.appRepo.find({ where: { jobId }, relations: ['applicant'], order: { appliedAt: 'DESC' } });
  }

  async getMyApplications(userId: string) {
    return this.appRepo.find({ where: { applicantId: userId }, relations: ['job'], order: { appliedAt: 'DESC' } });
  }

  async updateApplicationStatus(appId: string, userId: string, dto: UpdateApplicationStatusDto): Promise<JobApplication> {
    const app = await this.appRepo.findOne({ where: { id: appId }, relations: ['job'] });
    if (!app) throw new NotFoundException('Application not found');
    if (app.job.instructorId !== userId) throw new ForbiddenException('Not your job');

    app.status = dto.status;
    app.reviewNote = dto.reviewNote;
    const saved = await this.appRepo.save(app);

    this.events.emit('job.application.status_changed', {
      applicationId: appId,
      applicantId: app.applicantId,
      status: dto.status,
      jobTitle: app.job.title,
    });

    // Mark job as filled when accepting
    if (dto.status === ApplicationStatus.ACCEPTED) {
      await this.jobRepo.update(app.jobId, { status: JobStatus.FILLED });
    }
    return saved;
  }

  async withdraw(appId: string, userId: string): Promise<void> {
    const app = await this.appRepo.findOne({ where: { id: appId, applicantId: userId } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status === ApplicationStatus.ACCEPTED) throw new ConflictException('Cannot withdraw accepted application');
    app.status = ApplicationStatus.WITHDRAWN;
    await this.appRepo.save(app);
  }

  // ── Skill-based recommendations ───────────────────────────────────────────

  async getMatchingJobs(userSkills: string[], limit = 10): Promise<Job[]> {
    if (!userSkills.length) return this.jobRepo.find({ where: { status: JobStatus.OPEN, isDeleted: false }, take: limit });
    const jobs = await this.jobRepo.find({ where: { status: JobStatus.OPEN, isDeleted: false } });
    return jobs
      .map(j => ({ job: j, score: (j.requiredSkills ?? []).filter(s => userSkills.includes(s)).length }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.job);
  }

  // ── Auto-expiry (runs every hour) ─────────────────────────────────────────

  @Cron(CronExpression.EVERY_HOUR)
  async expireOldJobs(): Promise<void> {
    const expired = await this.jobRepo.find({
      where: { status: JobStatus.OPEN, expiresAt: LessThan(new Date()) },
    });
    for (const job of expired) {
      job.status = JobStatus.EXPIRED;
      await this.jobRepo.save(job);
      this.events.emit('job.expired', { jobId: job.id, title: job.title });
    }
  }
}
