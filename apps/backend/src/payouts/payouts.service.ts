import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Payout } from './payout.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Course } from '../courses/course.entity';
import { RoyaltyCalculationService } from './royalty-calculation.service';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    @InjectRepository(Payout)
    private readonly payoutsRepository: Repository<Payout>,
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
    private readonly royaltyCalculationService: RoyaltyCalculationService
  ) {}

  async calculatePayouts(startDate: Date, endDate: Date): Promise<Payout[]> {
    const courses = await this.coursesRepository.find({
      where: { instructorId: null },
      relations: ['instructor'],
    });

    const payouts: Payout[] = [];

    for (const course of courses) {
      if (!course.instructor) continue;

      const completions = await this.enrollmentsRepository.count({
        where: {
          courseId: course.id,
          completedAt: Between(startDate, endDate),
        },
      });

      if (completions === 0) continue;

      const coursePrice = this.royaltyCalculationService.getCoursePrice(course.id);
      const result = this.royaltyCalculationService.calculate({
        completions,
        coursePrice,
        courseId: course.id,
        instructorId: course.instructor.id,
      });

      const payout = this.payoutsRepository.create({
        instructorId: result.instructorId,
        courseId: result.courseId,
        totalRevenue: result.totalRevenue,
        platformFee: result.platformFee,
        instructorShare: result.instructorShare,
        status: 'pending',
        payoutDate: new Date(),
      });

      payouts.push(payout);
    }

    return this.payoutsRepository.save(payouts);
  }

  async processPayout(payoutId: string): Promise<Payout> {
    const payout = await this.payoutsRepository.findOne({
      where: { id: payoutId },
      relations: ['instructor'],
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    try {
      payout.status = 'processed';
      payout.transactionId = `TXN-${Date.now()}`;
      this.logger.log(
        `Payout processed for instructor ${payout.instructor.email}: $${payout.instructorShare}`
      );
    } catch (error) {
      payout.status = 'failed';
      this.logger.error(`Payout failed: ${error.message}`);
    }

    return this.payoutsRepository.save(payout);
  }

  async getInstructorPayouts(instructorId: string): Promise<Payout[]> {
    return this.payoutsRepository.find({
      where: { instructorId },
      relations: ['course'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPayoutStats(instructorId: string): Promise<{
    totalEarnings: number;
    pendingPayouts: number;
    processedPayouts: number;
  }> {
    const payouts = await this.payoutsRepository.find({ where: { instructorId } });

    const totalEarnings = payouts.reduce((sum, p) => sum + Number(p.instructorShare), 0);
    const pendingPayouts = payouts.filter((p) => p.status === 'pending').length;
    const processedPayouts = payouts.filter((p) => p.status === 'processed').length;

    return { totalEarnings, pendingPayouts, processedPayouts };
  }

  async getPayoutHistory(instructorId: string, limit = 10): Promise<Payout[]> {
    return this.payoutsRepository.find({
      where: { instructorId },
      relations: ['course'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
