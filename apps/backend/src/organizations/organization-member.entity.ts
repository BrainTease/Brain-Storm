import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Organization, OrgRole } from './organization.entity';
import { User } from '../users/user.entity';

@Entity('organization_members')
@Index(['organizationId', 'userId'], { unique: true })
@Index(['organizationId', 'role'])
export class OrganizationMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, (o) => o.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ enum: OrgRole, default: OrgRole.MEMBER })
  role: OrgRole;

  @Column({ default: null, nullable: true })
  invitedEmail: string;

  @Column({ default: false })
  invitePending: boolean;

  @Column({ default: null, nullable: true })
  inviteToken: string;

  @CreateDateColumn()
  createdAt: Date;
}
