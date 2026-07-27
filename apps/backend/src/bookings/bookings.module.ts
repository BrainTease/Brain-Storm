import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvailabilitySlot } from './availability-slot.entity';
import { BookingRequest } from './booking-request.entity';
import { BookingService } from './booking.service';
import { BookingsController } from './bookings.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AvailabilitySlot, BookingRequest]),
    NotificationsModule,
  ],
  providers: [BookingService],
  controllers: [BookingsController],
  exports: [BookingService],
})
export class BookingsModule {}
