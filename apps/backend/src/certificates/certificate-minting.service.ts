/**
 * #808 — Certificate-Issuance: Stellar Minting Step
 *
 * Responsible for submitting the certificate to the Stellar network and
 * updating the certificate record with the resulting transaction ID.
 * Extracted from the monolithic `CertificatesService.issueCertificate` so
 * the minting step is independently testable and replaceable.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate } from './certificate.entity';
import { StellarService } from '../stellar/stellar.service';

@Injectable()
export class CertificateMintingService {
  private readonly logger = new Logger(CertificateMintingService.name);

  constructor(
    @InjectRepository(Certificate)
    private readonly repo: Repository<Certificate>,
    private readonly stellarService: StellarService
  ) {}

  /**
   * Attempt to mint the certificate on the Stellar network.
   *
   * If the user has a Stellar public key the credential is issued and the
   * certificate is updated with the transaction ID and `minted` status.
   * Stellar failures are logged but do **not** propagate — the certificate
   * remains in `pending` status so it can be retried later.
   *
   * @returns The (possibly updated) certificate.
   */
  async mint(certificate: Certificate, stellarPublicKey: string | undefined): Promise<Certificate> {
    if (!stellarPublicKey) {
      this.logger.warn(`No Stellar public key for user ${certificate.userId} — skipping minting`);
      return certificate;
    }

    try {
      const txId = await this.stellarService.issueCredential(
        stellarPublicKey,
        certificate.courseId
      );
      certificate.stellarTransactionId = txId;
      certificate.status = 'minted';
      const updated = await this.repo.save(certificate);
      this.logger.log(`Certificate ${certificate.id} minted on Stellar (tx: ${txId})`);
      return updated;
    } catch (error: any) {
      this.logger.error(
        `Stellar minting failed for certificate ${certificate.id}: ${error?.message}`
      );
      // Non-fatal: certificate stays in 'pending' status
      return certificate;
    }
  }
}
