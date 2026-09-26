import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  KycDocumentUploadInput,
  KycDocumentUploadResult,
  KycProvider,
  KycSessionResult,
} from './kyc-provider.interface';

const SYNAPS_BASE_URL = 'https://api.synaps.io/v4';

/**
 * KycProvider implementation backed by Synaps.
 * This is the only file in the codebase that should know about Synaps'
 * specific HTTP contract — everything else talks to the KycProvider
 * interface.
 */
@Injectable()
export class SynapsKycProvider implements KycProvider {
  private readonly logger = new Logger(SynapsKycProvider.name);
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('kyc.providerApiKey') ?? '';
  }

  async createSession(alias: string, fields: Record<string, string>): Promise<KycSessionResult> {
    if (!this.apiKey) {
      return { ok: false, providerId: null };
    }

    try {
      const res = await fetch(`${SYNAPS_BASE_URL}/individual/session`, {
        method: 'POST',
        headers: {
          'Client-Id': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ alias, ...fields }),
      });

      if (!res.ok) {
        this.logger.warn(`KYC provider returned ${res.status} for ${alias}`);
        return { ok: false, providerId: null, statusCode: res.status };
      }

      const data = await res.json();
      return { ok: true, providerId: data.session_id ?? data.id ?? null, statusCode: res.status };
    } catch (err: unknown) {
      this.logger.error(
        `KYC provider request failed: ${err instanceof Error ? err.message : String(err)}`
      );
      return { ok: false, providerId: null };
    }
  }

  async uploadDocument(input: KycDocumentUploadInput): Promise<KycDocumentUploadResult> {
    if (!this.apiKey) {
      return { ok: false, providerReference: null };
    }

    try {
      const response = await fetch(`${SYNAPS_BASE_URL}/individual/document`, {
        method: 'POST',
        headers: {
          'Client-Id': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alias: input.stellarPublicKey,
          filename: input.filename,
          contentBase64: input.contentBase64,
          mimeType: input.mimetype,
        }),
      });

      if (!response.ok) {
        this.logger.warn(`KYC document upload failed with ${response.status}`);
        return { ok: false, providerReference: null, statusCode: response.status };
      }

      const payload = await response.json();
      return {
        ok: true,
        providerReference: payload.document_id ?? payload.id ?? null,
        statusCode: response.status,
      };
    } catch (err: unknown) {
      this.logger.error(
        `KYC document upload failed: ${err instanceof Error ? err.message : String(err)}`
      );
      return { ok: false, providerReference: null };
    }
  }
}
