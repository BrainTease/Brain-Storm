import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Payout } from './payout.entity';
import { Enrollment } from '../enrollments/enrollment.entity';
import { Course } from '../courses/course.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    @InjectRepository(Payout)
    private payoutsRepository: Repository<Payout>,
    @InjectRepository(Enrollment)
    private enrollmentsRepository: Repository<Enrollment>,
    @InjectRepository(Course)
    private coursesRepository: Repository<Course>,
    private configService: ConfigService,
  ) {}

  async calculatePayouts(startDate: Date, endDate: Date): Promise<Payout[]> {
    const platformFeePercent = this.configService.get<number>('PLATFORM_FEE_PERCENT', 20);

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

      const coursePrice = this.configService.get<number>(`COURSE_PRICE_${course.id}`, 0);
      const totalRevenue = completions * coursePrice;
      const platformFee = (totalRevenue * platformFeePercent) / 100;
      const instructorShare = totalRevenue - platformFee;

      const payout = this.payoutsRepository.create({
        instructorId: course.instructor.id,
        courseId: course.id,
        totalRevenue,
        platformFee,
        instructorShare,
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
      this.logger.log(`Payout processed for instructor ${payout.instructor.email}: $${payout.instructorShare}`);
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
    const payouts = await this.payoutsRepository.find({
      where: { instructorId },
    });

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
