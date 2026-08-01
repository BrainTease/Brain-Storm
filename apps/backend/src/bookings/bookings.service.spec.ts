import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingService } from './booking.service';
import { BookingRequest, BookingStatus } from './booking-request.entity';
import { AvailabilitySlot } from './availability-slot.entity';
import { NotificationsService } from '../notifications/notifications.service';

describe('BookingService', () => {
  let service: BookingService;

  const mockBookingRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockSlotRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };
  const mockNotifications = { create: jest.fn().mockResolvedValue(undefined) };

  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const makeBooking = (overrides: Partial<BookingRequest> = {}): BookingRequest =>
    ({
      id: 'b1',
      requesterId: 'req-1',
      workerId: 'wrk-1',
      startTime: new Date('2030-01-01T09:00:00Z'),
      endTime: new Date('2030-01-01T10:00:00Z'),
      status: BookingStatus.PENDING,
      ...overrides,
    }) as BookingRequest;

  beforeEach(async () => {
    mockBookingRepo.createQueryBuilder.mockReturnValue(qb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: getRepositoryToken(BookingRequest), useValue: mockBookingRepo },
        { provide: getRepositoryToken(AvailabilitySlot), useValue: mockSlotRepo },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => jest.clearAllMocks());

  // ── createBooking ────────────────────────────────────────────────────────────

  describe('createBooking', () => {
    it('creates a booking when no conflict exists', async () => {
      const booking = makeBooking();
      qb.getOne.mockResolvedValue(null); // no conflict
      mockBookingRepo.create.mockReturnValue(booking);
      mockBookingRepo.save.mockResolvedValue(booking);

      const result = await service.createBooking(
        'req-1',
        'wrk-1',
        '2030-01-01T09:00:00Z',
        '2030-01-01T10:00:00Z'
      );

      expect(result).toEqual(booking);
      expect(mockNotifications.create).toHaveBeenCalledTimes(2); // worker + requester
    });

    it('throws ConflictException when worker already has a confirmed booking', async () => {
      qb.getOne.mockResolvedValue(makeBooking({ status: BookingStatus.CONFIRMED }));

      await expect(
        service.createBooking('req-1', 'wrk-1', '2030-01-01T09:00:00Z', '2030-01-01T10:00:00Z')
      ).rejects.toThrow(ConflictException);

      expect(mockBookingRepo.save).not.toHaveBeenCalled();
    });
  });

  // ── respondToBooking ─────────────────────────────────────────────────────────

  describe('respondToBooking', () => {
    it('confirms a pending booking when worker accepts', async () => {
      const booking = makeBooking();
      const saved = makeBooking({ status: BookingStatus.CONFIRMED });
      mockBookingRepo.findOne.mockResolvedValue(booking);
      mockBookingRepo.save.mockResolvedValue(saved);

      const result = await service.respondToBooking('wrk-1', 'b1', true);

      expect(booking.status).toBe(BookingStatus.CONFIRMED);
      expect(result).toEqual(saved);
      expect(mockNotifications.create).toHaveBeenCalledTimes(1);
    });

    it('rejects a pending booking when worker declines', async () => {
      const booking = makeBooking();
      const saved = makeBooking({ status: BookingStatus.REJECTED });
      mockBookingRepo.findOne.mockResolvedValue(booking);
      mockBookingRepo.save.mockResolvedValue(saved);

      await service.respondToBooking('wrk-1', 'b1', false);

      expect(booking.status).toBe(BookingStatus.REJECTED);
    });

    it('throws NotFoundException when booking not found', async () => {
      mockBookingRepo.findOne.mockResolvedValue(null);

      await expect(service.respondToBooking('wrk-1', 'missing', true)).rejects.toThrow(
        NotFoundException
      );
    });

    it('throws ForbiddenException when worker does not own the booking', async () => {
      const booking = makeBooking({ workerId: 'other-worker' });
      mockBookingRepo.findOne.mockResolvedValue(booking);

      await expect(service.respondToBooking('wrk-1', 'b1', true)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('throws ConflictException when booking is no longer pending', async () => {
      const booking = makeBooking({ status: BookingStatus.CONFIRMED });
      mockBookingRepo.findOne.mockResolvedValue(booking);

      await expect(service.respondToBooking('wrk-1', 'b1', true)).rejects.toThrow(
        ConflictException
      );
    });
  });

  // ── cancelBooking ─────────────────────────────────────────────────────────────

  describe('cancelBooking', () => {
    it('cancels a booking when requester cancels', async () => {
      const booking = makeBooking();
      const saved = makeBooking({ status: BookingStatus.CANCELLED });
      mockBookingRepo.findOne.mockResolvedValue(booking);
      mockBookingRepo.save.mockResolvedValue(saved);

      const result = await service.cancelBooking('req-1', 'b1');

      expect(booking.status).toBe(BookingStatus.CANCELLED);
      expect(result).toEqual(saved);
      expect(mockNotifications.create).toHaveBeenCalledTimes(1);
    });

    it('cancels a booking when worker cancels', async () => {
      const booking = makeBooking();
      mockBookingRepo.findOne.mockResolvedValue(booking);
      mockBookingRepo.save.mockResolvedValue(booking);

      await service.cancelBooking('wrk-1', 'b1');

      expect(booking.status).toBe(BookingStatus.CANCELLED);
    });

    it('throws NotFoundException when booking not found', async () => {
      mockBookingRepo.findOne.mockResolvedValue(null);

      await expect(service.cancelBooking('req-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is neither requester nor worker', async () => {
      const booking = makeBooking();
      mockBookingRepo.findOne.mockResolvedValue(booking);

      await expect(service.cancelBooking('stranger', 'b1')).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException when booking is already rejected', async () => {
      const booking = makeBooking({ status: BookingStatus.REJECTED });
      mockBookingRepo.findOne.mockResolvedValue(booking);

      await expect(service.cancelBooking('req-1', 'b1')).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when booking is already cancelled', async () => {
      const booking = makeBooking({ status: BookingStatus.CANCELLED });
      mockBookingRepo.findOne.mockResolvedValue(booking);

      await expect(service.cancelBooking('req-1', 'b1')).rejects.toThrow(ConflictException);
    });
  });
});
