import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationsModule } from '../notifications/notifications.module';

import { AvailabilitySlot } from './availability-slot.entity';
import { BookingRequest } from './booking-request.entity';
import { BookingService } from './booking.service';
import { BookingsController } from './bookings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AvailabilitySlot, BookingRequest]), NotificationsModule],
  providers: [BookingService],
  controllers: [BookingsController],
  exports: [BookingService],
})
export class BookingsModule {}
