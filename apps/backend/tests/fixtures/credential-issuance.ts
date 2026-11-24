import type { Cache } from 'cache-manager';
import type { Repository } from 'typeorm';
import type { Course } from '../../src/courses/course.entity';
import type { CoursesService } from '../../src/courses/courses.service';
import type { Credential } from '../../src/credentials/credential.entity';
import { CredentialsController } from '../../src/credentials/credentials.controller';
import { CredentialsService } from '../../src/credentials/credentials.service';
import { PublicCredentialVerificationController } from '../../src/credentials/public-credential-verification.controller';
import type { CertificateRenderer } from '../../src/credentials/certificate-pdf.service';
import type { KycService } from '../../src/kyc/kyc.service';
import type { CredentialsRepository } from '../../src/repositories/credentials-repository.interface';
import type { StellarService } from '../../src/stellar/stellar.service';
import { createMockStellarService } from '../../src/test/fixtures/mock-stellar-service';

export const TEST_CREDENTIAL_IDS = {
  user: 'user-1522-test',
  course: 'course-1522-test',
  credential: 'credential-1522-test',
  publicKey: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
  txHash: 'stellar-credential-tx-1522',
} as const;

export function createCredentialIssuanceFixture() {
  const course = { id: TEST_CREDENTIAL_IDS.course, title: 'Stellar Basics', requiresKyc: false } as Course;
  const records = new Map<string, Credential>();
  const stellarService = createMockStellarService({
    txHash: TEST_CREDENTIAL_IDS.txHash,
    transaction: { ledger_attr: 42 },
  }).service as unknown as jest.Mocked<StellarService>;

  const credentialRepository = {
    findOne: jest.fn(async ({ where }: { where: Partial<Credential> }) =>
      [...records.values()].find((record) =>
        Object.entries(where).every(([key, value]) => record[key as keyof Credential] === value)
      ) ?? null
    ),
    create: jest.fn((value: Partial<Credential>) => value as Credential),
    save: jest.fn(async (value: Credential) => {
      const credential = {
        ...value,
        id: value.id ?? TEST_CREDENTIAL_IDS.credential,
        issuedAt: value.issuedAt ?? new Date('2026-01-01T00:00:00.000Z'),
        course,
      } as Credential;
      records.set(credential.id, credential);
      return credential;
    }),
    find: jest.fn(async ({ where }: { where: Partial<Credential> }) =>
      [...records.values()].filter((record) => record.userId === where.userId)
    ),
  } as unknown as jest.Mocked<Repository<Credential>>;

  const credentialsRepository: CredentialsRepository = {
    findById: async (id) => records.get(id) ?? null,
    save: async (value) => credentialRepository.save(value as Credential),
    remove: async (value) => value,
    findByUser: async (userId) => [...records.values()].filter((record) => record.userId === userId),
    findByUserAndCourse: async (userId, courseId) =>
      [...records.values()].find((record) => record.userId === userId && record.courseId === courseId) ?? null,
    findByTxHash: async (txHash) => [...records.values()].find((record) => record.txHash === txHash) ?? null,
    findByIdWithRelations: async (id) => records.get(id) ?? null,
    findByTxHashWithRelations: async (txHash) =>
      [...records.values()].find((record) => record.txHash === txHash) ?? null,
  };

  const coursesService = {
    findOne: jest.fn().mockResolvedValue(course),
  } as unknown as CoursesService;
  const kycService = {
    isApproved: jest.fn().mockResolvedValue(true),
  } as unknown as KycService;
  const cache = {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
  } as unknown as Cache;

  const service = new CredentialsService(
    credentialRepository,
    stellarService,
    kycService,
    coursesService
  );
  const controller = new CredentialsController(service, {} as CertificateRenderer);
  const publicController = new PublicCredentialVerificationController(
    credentialsRepository,
    stellarService,
    cache
  );

  return { cache, controller, credentialsRepository, publicController, records, service, stellarService };
}
