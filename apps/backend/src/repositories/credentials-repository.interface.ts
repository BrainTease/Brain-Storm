import { Credential } from '../credentials/credential.entity';
import { BaseRepository } from './base-repository.interface';

export interface CredentialsRepository extends BaseRepository<Credential> {
  findByUser(userId: string): Promise<Credential[]>;
  findByUserAndCourse(userId: string, courseId: string): Promise<Credential | null>;
  findByTxHash(txHash: string): Promise<Credential | null>;
}