import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KycCustomer, KycStatus } from './kyc-customer.entity';
import { KycDocument } from './kyc-document.entity';
import { KYC_PROVIDER, KycProvider } from './providers/kyc-provider.interface';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    @InjectRepository(KycCustomer) private repo: Repository<KycCustomer>,
    @InjectRepository(KycDocument) private documentRepo: Repository<KycDocument>,
    @Inject(KYC_PROVIDER) private readonly provider: KycProvider
  ) {}

  async getStatus(stellarPublicKey: string): Promise<KycCustomer> {
    const customer = await this.repo.findOne({ where: { stellarPublicKey } });
    if (!customer) {
      // Return a virtual record — no DB row yet
      return Object.assign(new KycCustomer(), { stellarPublicKey, status: 'none' as KycStatus });
    }
    return customer;
  }

  async upsertCustomer(
    stellarPublicKey: string,
    fields: Record<string, string>
  ): Promise<KycCustomer> {
    let customer = await this.repo.findOne({ where: { stellarPublicKey } });

    if (!customer) {
      customer = this.repo.create({ stellarPublicKey, status: 'pending' });
    } else {
      customer.status = 'pending';
    }

    const result = await this.provider.createSession(stellarPublicKey, fields);
    if (result.ok) {
      customer.providerId = result.providerId;
    } else {
      this.logger.warn(`KYC provider session creation failed for ${stellarPublicKey}`);
    }

    return this.repo.save(customer);
  }

  async uploadDocument(
    stellarPublicKey: string,
    file: Express.Multer.File
  ): Promise<{ documentId: string; status: KycStatus }> {
    const customer = await this.repo.findOne({ where: { stellarPublicKey } });
    if (!customer) {
      throw new Error(`Customer record not found for ${stellarPublicKey}`);
    }

    const document = this.documentRepo.create({
      stellarPublicKey,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      providerReference: null,
      metadata: { uploadDate: new Date().toISOString() },
    });

    const result = await this.provider.uploadDocument({
      stellarPublicKey,
      filename: file.originalname,
      mimetype: file.mimetype,
      contentBase64: file.buffer.toString('base64'),
    });

    if (result.ok) {
      document.providerReference = result.providerReference;
    } else {
      this.logger.warn(`KYC document upload failed for ${stellarPublicKey}`);
    }

    const savedDocument = await this.documentRepo.save(document);
    customer.status = 'pending';
    await this.repo.save(customer);

    return { documentId: savedDocument.id, status: customer.status };
  }

  async getComplianceReport() {
    const results = await this.repo
      .createQueryBuilder('customer')
      .select('customer.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('customer.status')
      .getRawMany();

    return results.reduce(
      (acc, row) => {
        acc[row.status] = Number(row.count);
        return acc;
      },
      {} as Record<string, number>
    );
  }

  /** Called by the webhook endpoint when the provider sends a status update */
  async handleWebhook(payload: {
    alias?: string;
    session_id?: string;
    status: string;
  }): Promise<void> {
    const where = payload.alias
      ? { stellarPublicKey: payload.alias }
      : { providerId: payload.session_id };

    const customer = await this.repo.findOne({ where: where as any });
    if (!customer) {
      this.logger.warn(`Webhook received for unknown customer: ${JSON.stringify(where)}`);
      return;
    }

    const statusMap: Record<string, KycStatus> = {
      APPROVED: 'approved',
      VERIFIED: 'approved',
      REJECTED: 'rejected',
      DECLINED: 'rejected',
      PENDING: 'pending',
    };

    customer.status = statusMap[payload.status?.toUpperCase()] ?? 'pending';
    await this.repo.save(customer);
    this.logger.log(`KYC status updated: ${customer.stellarPublicKey} → ${customer.status}`);
  }

  async isApproved(stellarPublicKey: string): Promise<boolean> {
    const customer = await this.repo.findOne({ where: { stellarPublicKey } });
    return customer?.status === 'approved';
  }
}
