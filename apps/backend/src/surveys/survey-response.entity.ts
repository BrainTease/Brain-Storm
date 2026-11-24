import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { User } from '../users/user.entity';

import { Survey } from './survey.entity';

@Entity('survey_responses')
export class SurveyResponse {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  surveyId!: string;

  @ManyToOne(() => Survey, (s) => s.responses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'surveyId' })
  survey!: Survey;

  @Column()
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column('jsonb')
  answers!: Record<string, string | number>;

  @CreateDateColumn()
  submittedAt!: Date;
}
