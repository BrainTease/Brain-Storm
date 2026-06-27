import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from './organization.entity';

@Entity('organization_billing_profiles')
export class OrganizationBillingProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, (o) => o.billingProfiles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column()
  stripeCustomerId: string;

  @Column({ nullable: true })
  paymentMethodId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  monthlyBudget: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  spent: number;

  @Column({ nullable: true })
  billingEmail: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
