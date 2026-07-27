import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('platform_analytics')
export class PlatformAnalytics {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  totalUsers: number;

  @Column()
  totalCourses: number;

  @Column()
  totalEnrollments: number;

  @Column()
  totalCompletions: number;

  @Column({ type: 'float', default: 0 })
  completionRate: number;

  @Column({ type: 'float', default: 0 })
  averageRating: number;

  @Column()
  totalReviews: number;

  @Column({ type: 'float', default: 0 })
  averageProgressPct: number;

  @Column()
  activeLearnersLast30Days: number;

  @Column()
  newUsersLast30Days: number;

  @Column()
  newEnrollmentsLast30Days: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}