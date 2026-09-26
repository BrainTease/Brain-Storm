import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KycService } from './kyc.service';
import { KycCustomer, KycStatus } from './kyc-customer.entity';
import { KycDocument } from './kyc-document.entity';
import { KYC_PROVIDER } from './providers/kyc-provider.interface';
import { MockKycProvider } from './providers/mock-kyc.provider';

describe('KycService', () => {
  let service: KycService;
  let mockProvider: MockKycProvider;

  const mockCustomerRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const mockDocumentRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const qb: any = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    mockCustomerRepo.createQueryBuilder.mockReturnValue(qb);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KycService,
        { provide: getRepositoryToken(KycCustomer), useValue: mockCustomerRepo },
        { provide: getRepositoryToken(KycDocument), useValue: mockDocumentRepo },
        { provide: KYC_PROVIDER, useClass: MockKycProvider },
      ],
    }).compile();

    service = module.get<KycService>(KycService);
    mockProvider = module.get(KYC_PROVIDER);
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => jest.clearAllMocks());

  // ── getStatus ──────────────────────────────────────────────────────────────

  describe('getStatus', () => {
    it('returns existing customer record', async () => {
      const customer = { stellarPublicKey: 'GKEY', status: 'approved' as KycStatus } as KycCustomer;
      mockCustomerRepo.findOne.mockResolvedValue(customer);

      const result = await service.getStatus('GKEY');

      expect(result).toEqual(customer);
    });

    it('returns virtual record with status "none" when customer does not exist', async () => {
      mockCustomerRepo.findOne.mockResolvedValue(null);

      const result = await service.getStatus('GNEW');

      expect(result.stellarPublicKey).toBe('GNEW');
      expect(result.status).toBe('none');
    });
  });

  // ── upsertCustomer ─────────────────────────────────────────────────────────

  describe('upsertCustomer', () => {
    it('creates a new customer record when none exists', async () => {
      const created = { stellarPublicKey: 'GKEY', status: 'pending' as KycStatus } as KycCustomer;
      mockCustomerRepo.findOne.mockResolvedValue(null);
      mockCustomerRepo.create.mockReturnValue(created);
      mockCustomerRepo.save.mockImplementation((c: any) => Promise.resolve(c));

      const result = await service.upsertCustomer('GKEY', { firstName: 'Alice' });

      expect(mockCustomerRepo.create).toHaveBeenCalledWith({
        stellarPublicKey: 'GKEY',
        status: 'pending',
      });
      expect(result.providerId).toBe('mock-session-1');
    });

    it('resets an existing customer status to pending on re-submission', async () => {
      const existing = {
        stellarPublicKey: 'GKEY',
        status: 'rejected' as KycStatus,
        providerId: 'old',
      } as KycCustomer;
      mockCustomerRepo.findOne.mockResolvedValue(existing);
      mockCustomerRepo.save.mockImplementation((c: any) => Promise.resolve(c));

      await service.upsertCustomer('GKEY', { firstName: 'Alice' });

      expect(existing.status).toBe('pending');
    });

    it('stores the provider session id when the provider call succeeds', async () => {
      const customer = { stellarPublicKey: 'GKEY', status: 'pending' as KycStatus } as KycCustomer;
      mockCustomerRepo.findOne.mockResolvedValue(null);
      mockCustomerRepo.create.mockReturnValue(customer);
      mockCustomerRepo.save.mockImplementation((c: any) => Promise.resolve(c));

      await service.upsertCustomer('GKEY', {});

      expect(customer.providerId).toBe('mock-session-1');
      expect(mockProvider.sessions).toEqual([{ alias: 'GKEY', fields: {} }]);
    });

    it('saves customer even when the provider call fails (non-fatal)', async () => {
      jest.spyOn(mockProvider, 'createSession').mockResolvedValue({ ok: false, providerId: null });
      const customer = { stellarPublicKey: 'GKEY', status: 'pending' as KycStatus } as KycCustomer;
      mockCustomerRepo.findOne.mockResolvedValue(null);
      mockCustomerRepo.create.mockReturnValue(customer);
      mockCustomerRepo.save.mockImplementation((c: any) => Promise.resolve(c));

      await expect(service.upsertCustomer('GKEY', {})).resolves.toBeDefined();
      expect(mockCustomerRepo.save).toHaveBeenCalled();
    });
  });

  // ── handleWebhook ──────────────────────────────────────────────────────────

  describe('handleWebhook', () => {
    it('updates customer status to approved for APPROVED webhook', async () => {
      const customer = { stellarPublicKey: 'GKEY', status: 'pending' as KycStatus } as KycCustomer;
      mockCustomerRepo.findOne.mockResolvedValue(customer);
      mockCustomerRepo.save.mockImplementation((c: any) => Promise.resolve(c));

      await service.handleWebhook({ alias: 'GKEY', status: 'APPROVED' });

      expect(customer.status).toBe('approved');
    });

    it('maps VERIFIED to approved', async () => {
      const customer = { stellarPublicKey: 'GKEY', status: 'pending' as KycStatus } as KycCustomer;
      mockCustomerRepo.findOne.mockResolvedValue(customer);
      mockCustomerRepo.save.mockImplementation((c: any) => Promise.resolve(c));

      await service.handleWebhook({ alias: 'GKEY', status: 'VERIFIED' });

      expect(customer.status).toBe('approved');
    });

    it('maps REJECTED to rejected', async () => {
      const customer = { stellarPublicKey: 'GKEY', status: 'pending' as KycStatus } as KycCustomer;
      mockCustomerRepo.findOne.mockResolvedValue(customer);
      mockCustomerRepo.save.mockImplementation((c: any) => Promise.resolve(c));

      await service.handleWebhook({ alias: 'GKEY', status: 'REJECTED' });

      expect(customer.status).toBe('rejected');
    });

    it('defaults unknown statuses to pending', async () => {
      const customer = { stellarPublicKey: 'GKEY', status: 'approved' as KycStatus } as KycCustomer;
      mockCustomerRepo.findOne.mockResolvedValue(customer);
      mockCustomerRepo.save.mockImplementation((c: any) => Promise.resolve(c));

      await service.handleWebhook({ alias: 'GKEY', status: 'UNDER_REVIEW' });

      expect(customer.status).toBe('pending');
    });

    it('returns early without throwing when customer not found', async () => {
      mockCustomerRepo.findOne.mockResolvedValue(null);

      await expect(
        service.handleWebhook({ alias: 'UNKNOWN', status: 'APPROVED' })
      ).resolves.toBeUndefined();
      expect(mockCustomerRepo.save).not.toHaveBeenCalled();
    });

    it('looks up customer by session_id when alias not provided', async () => {
      const customer = {
        stellarPublicKey: 'GKEY',
        status: 'pending' as KycStatus,
        providerId: 'sess-123',
      } as KycCustomer;
      mockCustomerRepo.findOne.mockResolvedValue(customer);
      mockCustomerRepo.save.mockImplementation((c: any) => Promise.resolve(c));

      await service.handleWebhook({ session_id: 'sess-123', status: 'APPROVED' });

      expect(mockCustomerRepo.findOne).toHaveBeenCalledWith({
        where: { providerId: 'sess-123' },
      });
    });
  });

  // ── uploadDocument ───────────────────────────────────────────────────────────

  describe('uploadDocument', () => {
    it('uploads through the provider and records the returned reference', async () => {
      const customer = { stellarPublicKey: 'GKEY', status: 'approved' as KycStatus } as KycCustomer;
      mockCustomerRepo.findOne.mockResolvedValue(customer);
      mockCustomerRepo.save.mockImplementation((c: any) => Promise.resolve(c));
      const document = { id: 'doc-1', providerReference: null } as any;
      mockDocumentRepo.create.mockReturnValue(document);
      mockDocumentRepo.save.mockImplementation((d: any) => Promise.resolve(d));

      const file = {
        originalname: 'passport.png',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('fake-image'),
      } as Express.Multer.File;

      const result = await service.uploadDocument('GKEY', file);

      expect(result.documentId).toBe('doc-1');
      expect(document.providerReference).toBe('mock-document-1');
      expect(mockProvider.documents[0].stellarPublicKey).toBe('GKEY');
    });

    it('throws when the customer does not exist', async () => {
      mockCustomerRepo.findOne.mockResolvedValue(null);
      const file = { originalname: 'x.png', mimetype: 'image/png', size: 1, buffer: Buffer.from('x') } as any;

      await expect(service.uploadDocument('GMISSING', file)).rejects.toThrow(
        'Customer record not found for GMISSING'
      );
    });
  });

  // ── isApproved ─────────────────────────────────────────────────────────────

  describe('isApproved', () => {
    it('returns true when customer status is approved', async () => {
      mockCustomerRepo.findOne.mockResolvedValue({ status: 'approved' } as KycCustomer);
      expect(await service.isApproved('GKEY')).toBe(true);
    });

    it('returns false when customer status is pending', async () => {
      mockCustomerRepo.findOne.mockResolvedValue({ status: 'pending' } as KycCustomer);
      expect(await service.isApproved('GKEY')).toBe(false);
    });

    it('returns false when customer does not exist', async () => {
      mockCustomerRepo.findOne.mockResolvedValue(null);
      expect(await service.isApproved('GKEY')).toBe(false);
    });
  });
});
