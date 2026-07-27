import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { AvailabilitySlot } from './availability-slot.entity';
import { BookingRequest, BookingStatus } from './booking-request.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectRepository(AvailabilitySlot)
    private slotRepo: Repository<AvailabilitySlot>,
    @InjectRepository(BookingRequest)
    private bookingRepo: Repository<BookingRequest>,
    private notificationsService: NotificationsService,
  ) {}

  // ── Availability ──────────────────────────────────────────────────────────

  async setAvailability(
    workerId: string,
    slots: Array<{ startTime: string; endTime: string; timezone?: string }>,
  ): Promise<AvailabilitySlot[]> {
    // Replace all existing slots for this worker
    await this.slotRepo.delete({ workerId });
    const entities = slots.map((s) =>
      this.slotRepo.create({
        workerId,
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime),
        timezone: s.timezone ?? 'UTC',
      }),
    );
    return this.slotRepo.save(entities);
  }

  async getAvailability(workerId: string): Promise<AvailabilitySlot[]> {
    return this.slotRepo.find({
      where: { workerId, isAvailable: true },
      order: { startTime: 'ASC' },
    });
  }

  // ── Booking requests ──────────────────────────────────────────────────────

  async createBooking(
    requesterId: string,
    workerId: string,
    startTime: string,
    endTime: string,
    timezone: string = 'UTC',
    message?: string,
  ): Promise<BookingRequest> {
    const start = new Date(startTime);
    const end = new Date(endTime);

    // Conflict check: reject if the worker already has a confirmed booking that overlaps
    const conflict = await this.bookingRepo
      .createQueryBuilder('b')
      .where('b.workerId = :workerId', { workerId })
      .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('b.startTime < :end', { end })
      .andWhere('b.endTime > :start', { start })
      .getOne();

    if (conflict) {
      throw new ConflictException('Worker is already booked for the requested time slot');
    }

    const booking = await this.bookingRepo.save(
      this.bookingRepo.create({
        requesterId,
        workerId,
        startTime: start,
        endTime: end,
        timezone,
        message,
      }),
    );

    // Notify worker
    await this.notificationsService.create(
      workerId,
      NotificationType.ENROLLMENT, // closest generic type; extend enum for booking if desired
      `New booking request from user ${requesterId} for ${start.toISOString()}`,
    );

    // Notify requester
    await this.notificationsService.create(
      requesterId,
      NotificationType.ENROLLMENT,
      `Your booking request to worker ${workerId} is pending confirmation`,
    );

    this.logger.log(`Booking ${booking.id} created (requester=${requesterId}, worker=${workerId})`);
    return booking;
  }

  async respondToBooking(
    workerId: string,
    bookingId: string,
    accept: boolean,
  ): Promise<BookingRequest> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.workerId !== workerId) throw new ForbiddenException('Not your booking');
    if (booking.status !== BookingStatus.PENDING) {
      throw new ConflictException('Booking is no longer pending');
    }

    booking.status = accept ? BookingStatus.CONFIRMED : BookingStatus.REJECTED;
    const updated = await this.bookingRepo.save(booking);

    const statusLabel = accept ? 'confirmed' : 'rejected';

    // Notify requester
    await this.notificationsService.create(
      booking.requesterId,
      NotificationType.COMPLETION,
      `Your booking request for ${booking.startTime.toISOString()} has been ${statusLabel}`,
    );

    return updated;
  }

  async cancelBooking(userId: string, bookingId: string): Promise<BookingRequest> {
    const booking = await this.bookingRepo.findOne({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.requesterId !== userId && booking.workerId !== userId) {
      throw new ForbiddenException('Not your booking');
    }
    if ([BookingStatus.REJECTED, BookingStatus.CANCELLED].includes(booking.status)) {
      throw new ConflictException('Booking already closed');
    }

    booking.status = BookingStatus.CANCELLED;
    const updated = await this.bookingRepo.save(booking);

    // Notify the other party
    const otherParty = userId === booking.requesterId ? booking.workerId : booking.requesterId;
    await this.notificationsService.create(
      otherParty,
      NotificationType.COMPLETION,
      `Booking ${bookingId} has been cancelled`,
    );

    return updated;
  }

  getMyBookings(userId: string): Promise<BookingRequest[]> {
    return this.bookingRepo.find({
      where: [{ requesterId: userId }, { workerId: userId }],
      order: { startTime: 'ASC' },
    });
  }

  getBooking(bookingId: string): Promise<BookingRequest | null> {
    return this.bookingRepo.findOne({ where: { id: bookingId } });
  }
}
