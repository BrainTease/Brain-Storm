import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Credential } from '../credentials/credential.entity';
import { CredentialsRepository } from './credentials-repository.interface';

@Injectable()
export class TypeOrmCredentialsRepository implements CredentialsRepository {
  constructor(@InjectRepository(Credential) private repo: Repository<Credential>) {}

  findById(id: string): Promise<Credential | null> {
    return this.repo.findOne({ where: { id } });
  }

  save(data: Partial<Credential>): Promise<Credential> {
    if (data.id) {
      return this.repo.save(data);
    }
    return this.repo.save(this.repo.create(data));
  }

  remove(entity: Credential): Promise<Credential> {
    return this.repo.remove(entity);
  }

  findByUser(userId: string): Promise<Credential[]> {
    return this.repo.find({ where: { userId }, order: { issuedAt: 'DESC' } });
  }

  findByUserAndCourse(userId: string, courseId: string): Promise<Credential | null> {
    return this.repo.findOne({ where: { userId, courseId } });
  }

  findByTxHash(txHash: string): Promise<Credential | null> {
    return this.repo.findOne({ where: { txHash } });
  }
}