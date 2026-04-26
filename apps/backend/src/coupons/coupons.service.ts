import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from './coupon.entity';
import { CreateCouponDto, ValidateCouponDto } from './dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private couponsRepository: Repository<Coupon>,
  ) {}

  async create(dto: CreateCouponDto): Promise<Coupon> {
    const existing = await this.couponsRepository.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException('Coupon code already exists');
    }

    const coupon = this.couponsRepository.create({
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
    return this.couponsRepository.save(coupon);
  }

  async generateBulk(
    prefix: string,
    count: number,
    discountType: 'percentage' | 'fixed',
    discountValue: number,
    expiresAt?: Date,
  ): Promise<Coupon[]> {
    const coupons = [];
    for (let i = 0; i < count; i++) {
      const code = `${prefix}-${Date.now()}-${i}`;
      const coupon = this.couponsRepository.create({
        code,
        discountType,
        discountValue,
        expiresAt: expiresAt || null,
      });
      coupons.push(coupon);
    }
    return this.couponsRepository.save(coupons);
  }

  async validate(dto: ValidateCouponDto): Promise<{ valid: boolean; discount: number }> {
    const coupon = await this.couponsRepository.findOne({
      where: { code: dto.code },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (!coupon.isActive) {
      throw new BadRequestException('Coupon is inactive');
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      throw new BadRequestException('Coupon has expired');
    }

    if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    return {
      valid: true,
      discount: Number(coupon.discountValue),
    };
  }

  async incrementUsage(code: string): Promise<void> {
    await this.couponsRepository.increment(
      { code },
      'usageCount',
      1,
    );
  }

  async findAll(): Promise<Coupon[]> {
    return this.couponsRepository.find();
  }

  async findById(id: string): Promise<Coupon> {
    const coupon = await this.couponsRepository.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  async update(id: string, dto: Partial<CreateCouponDto>): Promise<Coupon> {
    const coupon = await this.findById(id);
    Object.assign(coupon, dto);
    return this.couponsRepository.save(coupon);
  }

  async delete(id: string): Promise<void> {
    const result = await this.couponsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Coupon not found');
    }
  }
}
