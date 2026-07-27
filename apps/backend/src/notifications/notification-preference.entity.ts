import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column({ default: true })
  inApp: boolean;

  @Column({ default: true })
  email: boolean;

  @Column({ default: false })
  push: boolean;

  @Column({ default: true })
  enrollment: boolean;

  @Column({ default: true })
  completion: boolean;

  @Column({ default: true })
  credentialIssued: boolean;

  @Column({ default: true })
  coursePublished: boolean;

  @CreateDateColumn()
  updatedAt: Date;
}
