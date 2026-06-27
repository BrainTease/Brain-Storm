import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Course, CourseStatus } from './course.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { Enrollment } from '../enrollments/enrollment.entity';

@Injectable()
export class CourseSchedulerService {
  private readonly logger = new Logger(CourseSchedulerService.name);

  constructor(
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(Enrollment) private enrollmentRepo: Repository<Enrollment>,
    private notificationsService: NotificationsService,
  ) {}

  /** Runs every minute to publish courses whose scheduledAt has passed. */
  @Cron(CronExpression.EVERY_MINUTE)
  async publishScheduledCourses(): Promise<void> {
    const now = new Date();

    const due = await this.courseRepo.find({
      where: {
        status: CourseStatus.SCHEDULED,
        scheduledAt: LessThanOrEqual(now),
        isDeleted: false,
      },
    });

    if (!due.length) return;

    for (const course of due) {
      course.status = CourseStatus.PUBLISHED;
      course.isPublished = true;
      course.publishedAt = now;
      await this.courseRepo.save(course);
      this.logger.log(`Published course "${course.title}" (${course.id})`);
      await this.notifyEnrolledStudents(course);
    }
  }

  private async notifyEnrolledStudents(course: Course): Promise<void> {
    const enrollments = await this.enrollmentRepo.find({
      where: { courseId: course.id },
    });

    await Promise.all(
      enrollments.map((e) =>
        this.notificationsService.create(
          e.userId,
          NotificationType.COURSE_PUBLISHED,
          `"${course.title}" is now live!`,
        ),
      ),
    );
  }
}
