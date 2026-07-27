import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { OrganizationMember } from './organization-member.entity';
import { OrganizationBillingProfile } from './organization-billing-profile.entity';

export enum OrgRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  INSTRUCTOR = 'INSTRUCTOR',
  MEMBER = 'MEMBER',
}

@Entity('organizations')
@Index(['slug'], { unique: true })
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ nullable: true })
  logo: string;

  @Column({ default: 0 })
  seats: number; // Total number of member seats

  @Column({ default: 0 })
  usedSeats: number;

  @Column({ nullable: true })
  domain: string;

  @Column({ default: true })
  active: boolean;

  @OneToMany(() => OrganizationMember, (m) => m.organization, { cascade: true })
  members: OrganizationMember[];

  @OneToMany(() => OrganizationBillingProfile, (b) => b.organization, { cascade: true })
  billingProfiles: OrganizationBillingProfile[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
