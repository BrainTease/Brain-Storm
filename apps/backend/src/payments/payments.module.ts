import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { Subscription } from './subscription.entity';
import { Invoice } from './invoice.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Enrollment } from '../enrollments/enrollment.entity';
import { StellarModule } from '../stellar/stellar.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Subscription, Invoice, Enrollment]),
    StellarModule,
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
