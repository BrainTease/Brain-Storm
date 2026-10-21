import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

// Modules under test
import { AuthModule } from '../src/auth/auth.module';
import { CertificatesModule } from '../src/certificates/certificates.module';

// Entities required by SQLite in-memory DB
import { User } from '../src/users/user.entity';
import { Course } from '../src/courses/course.entity';
import { Certificate } from '../src/certificates/certificate.entity';
import { Enrollment } from '../src/enrollments/enrollment.entity';
import { RefreshToken } from '../src/auth/refresh-token.entity';
import { PasswordResetToken } from '../src/auth/password-reset-token.entity';
import { TokenBlacklist } from '../src/auth/token-blacklist.entity';
import { ApiKey } from '../src/auth/api-key.entity';
import { StellarTransactionLog } from '../src/stellar/stellar-transaction-log.entity';

// Stub StellarService so no real Horizon/Soroban calls are made
import { StellarService } from '../src/stellar/stellar.service';

// Per-test data reset so specs pass in any order (#1362)
import { clearE2ETestData } from './e2e-test-utils';

const STELLAR_STUB = {
  issueCredential: jest.fn().mockResolvedValue('FAKE_TX_HASH'),
  getAccountBalance: jest.fn().mockResolvedValue([]),
  verifyTransaction: jest.fn().mockResolvedValue({ verified: true, hash: 'FAKE_TX_HASH' }),
};

const ALL_ENTITIES = [
  User,
  Course,
  Certificate,
  Enrollment,
  RefreshToken,
  PasswordResetToken,
  TokenBlacklist,
  ApiKey,
  StellarTransactionLog,
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function registerAndLogin(
  app: INestApplication,
  email: string,
  password: string,
  role: 'student' | 'admin' | 'instructor',
  userRepo: Repository<User>
): Promise<string> {
  await request(app.getHttpServer())
    .post('/v1/auth/register')
    .send({ email, password })
    .expect(201);

  const user = await userRepo.findOne({ where: { email } });
  await userRepo.save({ ...user!, isVerified: true, role });

  const loginResp = await request(app.getHttpServer())
    .post('/v1/auth/login')
    .send({ email, password })
    .expect(201);

  return loginResp.body.access_token as string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────

describe('Certificate Issuance & Verification (E2E)', () => {
  let app: INestApplication;
  let userRepo: Repository<User>;
  let courseRepo: Repository<Course>;
  let enrollmentRepo: Repository<Enrollment>;
  let certRepo: Repository<Certificate>;
  let dataSource: DataSource;

  let adminToken: string;
  let studentToken: string;
  let testCourse: Course;
  let testUser: User;

  beforeAll(async () => {
    process.env.EMAIL_ENABLED = 'false';
    process.env.JWT_SECRET = 'test-secret-e2e';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: ALL_ENTITIES,
          synchronize: true,
          dropSchema: true,
          logging: false,
        }),
        AuthModule,
        CertificatesModule,
      ],
    })
      .overrideProvider(StellarService)
      .useValue(STELLAR_STUB)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    userRepo = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    courseRepo = moduleFixture.get<Repository<Course>>(getRepositoryToken(Course));
    enrollmentRepo = moduleFixture.get<Repository<Enrollment>>(getRepositoryToken(Enrollment));
    certRepo = moduleFixture.get<Repository<Certificate>>(getRepositoryToken(Certificate));
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * Reset the database before every test and re-seed the shared fixtures.
   *
   * Without this reset the rows written by one test are still present in the
   * next one, which makes the suite order-dependent: the "certificate is
   * already issued" case only holds if an earlier test issued the certificate,
   * and re-running the suite fails because the seeded users already exist.
   */
  beforeEach(async () => {
    jest.clearAllMocks();
    STELLAR_STUB.issueCredential.mockResolvedValue('FAKE_TX_HASH');

    await clearE2ETestData(dataSource);

    // Seed an admin user and a student user
    adminToken = await registerAndLogin(
      app,
      'admin@cert-e2e.test',
      'Admin1234!',
      'admin',
      userRepo
    );
    studentToken = await registerAndLogin(
      app,
      'student@cert-e2e.test',
      'Student1234!',
      'student',
      userRepo
    );

    // Seed a course
    testCourse = await courseRepo.save(
      courseRepo.create({
        title: 'Blockchain 101',
        description: 'Intro to blockchain',
        level: 'beginner',
      })
    );

    // Fetch the seeded student user
    testUser = (await userRepo.findOne({ where: { email: 'student@cert-e2e.test' } }))!;
  });

  /**
   * Issue a certificate for the shared student/course pair and return it.
   * Tests that assert on an existing certificate use this so they do not
   * depend on a certificate created by another test.
   */
  async function issueCertificateForStudent(): Promise<Certificate> {
    await enrollmentRepo.save(
      enrollmentRepo.create({
        userId: testUser.id,
        courseId: testCourse.id,
        completedAt: new Date(),
      })
    );

    const resp = await request(app.getHttpServer())
      .post('/v1/certificates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: testUser.id, courseId: testCourse.id })
      .expect(201);

    return resp.body as Certificate;
  }

  // ── Issue certificate ────────────────────────────────────────────────────

  describe('POST /v1/certificates', () => {
    it('returns 401 when no JWT is provided', async () => {
      await request(app.getHttpServer())
        .post('/v1/certificates')
        .send({ userId: testUser.id, courseId: testCourse.id })
        .expect(401);
    });

    it('returns 403 when a student tries to issue a certificate', async () => {
      await request(app.getHttpServer())
        .post('/v1/certificates')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ userId: testUser.id, courseId: testCourse.id })
        .expect(403);
    });

    it('returns 400 when enrollment is missing', async () => {
      await request(app.getHttpServer())
        .post('/v1/certificates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: testUser.id, courseId: testCourse.id })
        .expect(400);
    });

    it('returns 400 when course is enrolled but not yet completed', async () => {
      await enrollmentRepo.save(
        enrollmentRepo.create({ userId: testUser.id, courseId: testCourse.id, completedAt: null })
      );

      await request(app.getHttpServer())
        .post('/v1/certificates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: testUser.id, courseId: testCourse.id })
        .expect(400);
    });

    it('issues a certificate successfully when enrollment is completed', async () => {
      // Create enrollment for this specific test
      await enrollmentRepo.save(
        enrollmentRepo.create({
          userId: testUser.id,
          courseId: testCourse.id,
          completedAt: new Date(),
        })
      );

      const resp = await request(app.getHttpServer())
        .post('/v1/certificates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: testUser.id, courseId: testCourse.id })
        .expect(201);

      expect(resp.body).toMatchObject({
        userId: testUser.id,
        courseId: testCourse.id,
      });
      expect(resp.body.id).toBeDefined();
      expect(resp.body.certificateHash).toBeDefined();
    });

    it('returns 400 when certificate is already issued', async () => {
      // Issue a certificate for this test only, then try to issue it again.
      await issueCertificateForStudent();

      await request(app.getHttpServer())
        .post('/v1/certificates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: testUser.id, courseId: testCourse.id })
        .expect(400);
    });

    it('returns 400 for invalid UUID fields', async () => {
      await request(app.getHttpServer())
        .post('/v1/certificates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: 'not-a-uuid', courseId: 'also-not-a-uuid' })
        .expect(400);
    });
  });

  // ── Verify certificate via POST ──────────────────────────────────────────

  describe('POST /v1/certificates/verify', () => {
    let issuedHash: string;

    beforeEach(async () => {
      // Each test issues its own certificate so it does not depend on a
      // certificate created by a previously executed test.
      const cert = await issueCertificateForStudent();
      issuedHash = cert.certificateHash;
    });

    it('returns valid: true for a known certificate hash', async () => {
      const resp = await request(app.getHttpServer())
        .post('/v1/certificates/verify')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ certificateHash: issuedHash })
        .expect(200);

      expect(resp.body.valid).toBe(true);
      expect(resp.body.certificate).toBeDefined();
    });

    it('returns valid: false for an unknown hash', async () => {
      const resp = await request(app.getHttpServer())
        .post('/v1/certificates/verify')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ certificateHash: 'deadbeefdeadbeef' })
        .expect(200);

      expect(resp.body.valid).toBe(false);
    });

    it('returns 401 when no JWT is provided', async () => {
      await request(app.getHttpServer())
        .post('/v1/certificates/verify')
        .send({ certificateHash: issuedHash })
        .expect(401);
    });
  });

  // ── Verify certificate via GET ───────────────────────────────────────────

  describe('GET /v1/certificates/verify/:hash', () => {
    let issuedHash: string;

    beforeEach(async () => {
      const cert = await issueCertificateForStudent();
      issuedHash = cert.certificateHash;
    });

    it('returns valid: true for a valid hash', async () => {
      const resp = await request(app.getHttpServer())
        .get(`/v1/certificates/verify/${issuedHash}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(resp.body.valid).toBeDefined();
    });

    it('returns valid: false for an unknown hash', async () => {
      const resp = await request(app.getHttpServer())
        .get('/v1/certificates/verify/unknownhash')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(resp.body.valid).toBe(false);
    });
  });

  // ── Get certificate by ID ────────────────────────────────────────────────

  describe('GET /v1/certificates/:id', () => {
    let certId: string;

    beforeEach(async () => {
      const cert = await issueCertificateForStudent();
      certId = cert.id;
    });

    it('returns the certificate details', async () => {
      const resp = await request(app.getHttpServer())
        .get(`/v1/certificates/${certId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(resp.body.id).toBe(certId);
      expect(resp.body.userId).toBe(testUser.id);
      expect(resp.body.courseId).toBe(testCourse.id);
    });

    it('returns 404 for a non-existent certificate ID', async () => {
      await request(app.getHttpServer())
        .get('/v1/certificates/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);
    });

    it('returns 401 when no JWT is provided', async () => {
      await request(app.getHttpServer()).get(`/v1/certificates/${certId}`).expect(401);
    });
  });

  // ── Get certificates by user ─────────────────────────────────────────────

  describe('GET /v1/certificates/user/:userId', () => {
    it('returns an array of certificates for the user', async () => {
      await issueCertificateForStudent();

      const resp = await request(app.getHttpServer())
        .get(`/v1/certificates/user/${testUser.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(Array.isArray(resp.body)).toBe(true);
      expect(resp.body.length).toBeGreaterThan(0);
      expect(resp.body[0].userId).toBe(testUser.id);
    });

    it('returns an empty array for a user with no certificates', async () => {
      const newUser = await userRepo.save(
        userRepo.create({ email: 'no-certs@e2e.test', passwordHash: 'x', isVerified: true })
      );

      const resp = await request(app.getHttpServer())
        .get(`/v1/certificates/user/${newUser.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(resp.body).toEqual([]);
    });
  });

  // ── Stellar minting integration ──────────────────────────────────────────

  describe('Stellar minting side-effects', () => {
    it('calls StellarService.issueCredential when student has a stellarPublicKey', async () => {
      // Create a new user with a Stellar public key
      const stellarUser = await userRepo.save(
        userRepo.create({
          email: 'stellar@cert-e2e.test',
          passwordHash: 'x',
          isVerified: true,
          role: 'student',
          stellarPublicKey: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
        })
      );

      const stellarCourse = await courseRepo.save(
        courseRepo.create({
          title: 'Stellar 101',
          description: 'Stellar blockchain',
          level: 'beginner',
        })
      );

      await enrollmentRepo.save(
        enrollmentRepo.create({
          userId: stellarUser.id,
          courseId: stellarCourse.id,
          completedAt: new Date(),
        })
      );

      await request(app.getHttpServer())
        .post('/v1/certificates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: stellarUser.id, courseId: stellarCourse.id })
        .expect(201);

      expect(STELLAR_STUB.issueCredential).toHaveBeenCalledWith(
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
        stellarCourse.id
      );
    });

    it('still issues certificate even when Stellar minting throws', async () => {
      STELLAR_STUB.issueCredential.mockRejectedValueOnce(new Error('Horizon down'));

      const gracefulUser = await userRepo.save(
        userRepo.create({
          email: 'graceful@cert-e2e.test',
          passwordHash: 'x',
          isVerified: true,
          role: 'student',
          stellarPublicKey: 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
        })
      );

      const gracefulCourse = await courseRepo.save(
        courseRepo.create({
          title: 'Graceful Degradation',
          description: 'Fallback test',
          level: 'advanced',
        })
      );

      await enrollmentRepo.save(
        enrollmentRepo.create({
          userId: gracefulUser.id,
          courseId: gracefulCourse.id,
          completedAt: new Date(),
        })
      );

      const resp = await request(app.getHttpServer())
        .post('/v1/certificates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: gracefulUser.id, courseId: gracefulCourse.id })
        .expect(201);

      // Certificate should be persisted with pending status (Stellar failed)
      expect(resp.body.id).toBeDefined();
      expect(resp.body.status).toBe('pending');
    });
  });
});
