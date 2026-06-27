import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UsersRepository } from './users-repository.interface';

@Injectable()
export class TypeOrmUsersRepository implements UsersRepository {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findByVerificationToken(hash: string): Promise<User | null> {
    return this.repo.findOne({ where: { verificationToken: hash } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  save(data: Partial<User>): Promise<User> {
    if (data.id) {
      return this.repo.save(data);
    }
    return this.repo.save(this.repo.create(data));
  }

  remove(entity: User): Promise<User> {
    return this.repo.remove(entity);
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    role?: string;
    isVerified?: boolean;
    search?: string;
  } = {}) {
    const { page = 1, limit = 10, role, isVerified, search } = options;
    
    const query = this.repo.createQueryBuilder('user');
    
    if (role) {
      query.andWhere('user.role = :role', { role });
    }
    
    if (isVerified !== undefined) {
      query.andWhere('user.isVerified = :isVerified', { isVerified });
    }
    
    if (search) {
      query.andWhere('user.email ILIKE :search', { search: `%${search}%` });
    }
    
    query.andWhere('user.deletedAt IS NULL');
    
    const [users, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.createdAt', 'DESC')
      .getManyAndCount();
    
    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}