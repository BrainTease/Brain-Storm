import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CouponsService } from './coupons.service';
import { Coupon } from './coupon.entity';
import { CreateCouponDto, ValidateCouponDto } from './dto';

describe('CouponsService', () => {
  let service: CouponsService;

  const mockRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    increment: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CouponsService, { provide: getRepositoryToken(Coupon), useValue: mockRepo }],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto: CreateCouponDto = {
      code: 'SAVE20',
      discountType: 'percentage',
      discountValue: 20,
    };

    it('creates a new coupon when code does not exist', async () => {
      const created = { id: 'cp1', ...dto, isActive: true, usageCount: 0 } as unknown as Coupon;
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { code: dto.code } });
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ code: dto.code }));
      expect(result).toEqual(created);
    });

    it('converts expiresAt string to Date', async () => {
      const expiresAt = '2030-01-01T00:00:00Z';
      const dtoWithExpiry: CreateCouponDto = { ...dto, code: 'EXPIRY20', expiresAt };
      const created = { id: 'cp2', ...dtoWithExpiry } as unknown as Coupon;
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      await service.create(dtoWithExpiry);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ expiresAt: new Date(expiresAt) })
      );
    });

    it('sets expiresAt to null when not provided', async () => {
      const created = { id: 'cp3', ...dto } as unknown as Coupon;
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      await service.create(dto);

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ expiresAt: null }));
    });

    it('throws BadRequestException when coupon code already exists', async () => {
      const existing = { id: 'cp1', code: dto.code } as Coupon;
      mockRepo.findOne.mockResolvedValue(existing);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    const validateDto: ValidateCouponDto = { code: 'SAVE20' };

    it('returns valid discount for an active, unexpired coupon', async () => {
      const coupon = {
        code: 'SAVE20',
        isActive: true,
        expiresAt: null,
        maxUsage: null,
        usageCount: 0,
        discountValue: 20,
      } as Coupon;
      mockRepo.findOne.mockResolvedValue(coupon);

      const result = await service.validate(validateDto);

      expect(result).toEqual({ valid: true, discount: 20 });
    });

    it('throws NotFoundException when coupon code does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.validate(validateDto)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when coupon is inactive', async () => {
      const coupon = { code: 'SAVE20', isActive: false } as Coupon;
      mockRepo.findOne.mockResolvedValue(coupon);

      await expect(service.validate(validateDto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when coupon has expired', async () => {
      const coupon = {
        code: 'SAVE20',
        isActive: true,
        expiresAt: new Date('2000-01-01'), // past date
        maxUsage: null,
        usageCount: 0,
      } as Coupon;
      mockRepo.findOne.mockResolvedValue(coupon);

      await expect(service.validate(validateDto)).rejects.toThrow(BadRequestException);
    });

    it('does not throw for coupon with future expiry', async () => {
      const coupon = {
        code: 'SAVE20',
        isActive: true,
        expiresAt: new Date('2099-12-31'),
        maxUsage: null,
        usageCount: 0,
        discountValue: 20,
      } as Coupon;
      mockRepo.findOne.mockResolvedValue(coupon);

      await expect(service.validate(validateDto)).resolves.toMatchObject({ valid: true });
    });

    it('throws BadRequestException when usage limit is reached', async () => {
      const coupon = {
        code: 'SAVE20',
        isActive: true,
        expiresAt: null,
        maxUsage: 100,
        usageCount: 100,
      } as Coupon;
      mockRepo.findOne.mockResolvedValue(coupon);

      await expect(service.validate(validateDto)).rejects.toThrow(BadRequestException);
    });

    it('does not throw when usage is below the limit', async () => {
      const coupon = {
        code: 'SAVE20',
        isActive: true,
        expiresAt: null,
        maxUsage: 100,
        usageCount: 99,
        discountValue: 15,
      } as Coupon;
      mockRepo.findOne.mockResolvedValue(coupon);

      await expect(service.validate(validateDto)).resolves.toMatchObject({
        valid: true,
        discount: 15,
      });
    });

    it('does not check usage limit when maxUsage is null', async () => {
      const coupon = {
        code: 'SAVE20',
        isActive: true,
        expiresAt: null,
        maxUsage: null,
        usageCount: 999,
        discountValue: 10,
      } as Coupon;
      mockRepo.findOne.mockResolvedValue(coupon);

      await expect(service.validate(validateDto)).resolves.toMatchObject({ valid: true });
    });
  });

  describe('incrementUsage', () => {
    it('increments usageCount by 1 for the given code', async () => {
      mockRepo.increment.mockResolvedValue(undefined);

      await service.incrementUsage('SAVE20');

      expect(mockRepo.increment).toHaveBeenCalledWith({ code: 'SAVE20' }, 'usageCount', 1);
    });
  });

  describe('findById', () => {
    it('returns coupon when found', async () => {
      const coupon = { id: 'cp1', code: 'SAVE20' } as Coupon;
      mockRepo.findOne.mockResolvedValue(coupon);

      const result = await service.findById('cp1');

      expect(result).toEqual(coupon);
    });

    it('throws NotFoundException when id not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes coupon when it exists', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 1 });

      await service.delete('cp1');

      expect(mockRepo.delete).toHaveBeenCalledWith('cp1');
    });

    it('throws NotFoundException when coupon does not exist', async () => {
      mockRepo.delete.mockResolvedValue({ affected: 0 });

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns all coupons', async () => {
      const coupons = [{ id: 'cp1' }, { id: 'cp2' }] as Coupon[];
      mockRepo.find.mockResolvedValue(coupons);

      const result = await service.findAll();

      expect(result).toEqual(coupons);
      expect(mockRepo.find).toHaveBeenCalledWith();
    });
  });
});
