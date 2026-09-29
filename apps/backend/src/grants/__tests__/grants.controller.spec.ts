import { Test, TestingModule } from '@nestjs/testing';
import { GrantsController } from '../grants.controller';
import { GrantsService } from '../grants.service';
import { GrantStatus } from '../entities/grant.entity';

describe('GrantsController', () => {
  let controller: GrantsController;
  let service: jest.Mocked<Partial<GrantsService>>;

  const grantId = 'grant-1';

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      disburse: jest.fn(),
      confirmOnChain: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GrantsController],
      providers: [{ provide: GrantsService, useValue: service }],
    }).compile();

    controller = module.get<GrantsController>(GrantsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates to GrantsService.create', async () => {
      const dto = { title: 'Grant A', amount: 1000 } as any;
      const created = { id: grantId, ...dto, status: GrantStatus.PENDING };
      (service.create as jest.Mock).mockResolvedValue(created);

      await expect(controller.create(dto)).resolves.toEqual(created);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('returns all grants', async () => {
      const grants = [{ id: grantId, status: GrantStatus.PENDING }];
      (service.findAll as jest.Mock).mockResolvedValue(grants);

      await expect(controller.findAll()).resolves.toEqual(grants);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns a single grant by id', async () => {
      const grant = { id: grantId, status: GrantStatus.APPROVED };
      (service.findOne as jest.Mock).mockResolvedValue(grant);

      await expect(controller.findOne(grantId)).resolves.toEqual(grant);
      expect(service.findOne).toHaveBeenCalledWith(grantId);
    });
  });

  describe('approve', () => {
    it('approves a pending grant', async () => {
      const approved = { id: grantId, status: GrantStatus.APPROVED };
      (service.approve as jest.Mock).mockResolvedValue(approved);

      await expect(controller.approve(grantId)).resolves.toEqual(approved);
      expect(service.approve).toHaveBeenCalledWith(grantId);
    });
  });

  describe('reject', () => {
    it('rejects a grant with a reason', async () => {
      const rejected = { id: grantId, status: GrantStatus.REJECTED };
      (service.reject as jest.Mock).mockResolvedValue(rejected);

      await expect(controller.reject(grantId, { reason: 'incomplete' } as any)).resolves.toEqual(
        rejected,
      );
      expect(service.reject).toHaveBeenCalledWith(grantId, { reason: 'incomplete' });
    });
  });

  describe('disburse', () => {
    it('disburses an approved grant', async () => {
      const disbursed = { id: grantId, status: GrantStatus.DISBURSED };
      (service.disburse as jest.Mock).mockResolvedValue(disbursed);

      await expect(controller.disburse(grantId, { amount: 500 } as any)).resolves.toEqual(
        disbursed,
      );
      expect(service.disburse).toHaveBeenCalledWith(grantId, { amount: 500 });
    });

    it('supports partial funding disbursement', async () => {
      const partial = { id: grantId, status: GrantStatus.PARTIALLY_FUNDED, fundedAmount: 500 };
      (service.disburse as jest.Mock).mockResolvedValue(partial);

      await expect(controller.disburse(grantId, { amount: 500 } as any)).resolves.toEqual(partial);
    });
  });

  describe('confirmOnChain', () => {
    it('confirms an on-chain disbursement', async () => {
      const confirmed = { id: grantId, status: GrantStatus.CONFIRMED, txHash: '0xabc' };
      (service.confirmOnChain as jest.Mock).mockResolvedValue(confirmed);

      await expect(controller.confirmOnChain(grantId, { txHash: '0xabc' } as any)).resolves.toEqual(
        confirmed,
      );
      expect(service.confirmOnChain).toHaveBeenCalledWith(grantId, { txHash: '0xabc' });
    });

    it('propagates on-chain confirmation failure', async () => {
      (service.confirmOnChain as jest.Mock).mockRejectedValue(new Error('tx failed'));

      await expect(
        controller.confirmOnChain(grantId, { txHash: '0xdead' } as any),
      ).rejects.toThrow('tx failed');
    });
  });
});
