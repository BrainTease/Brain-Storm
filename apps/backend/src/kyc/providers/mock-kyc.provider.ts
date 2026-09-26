import { Injectable } from '@nestjs/common';
import {
  KycDocumentUploadInput,
  KycDocumentUploadResult,
  KycProvider,
  KycSessionResult,
} from './kyc-provider.interface';

/**
 * In-memory KycProvider used in tests (and available for local/dev use)
 * so KYC flows can be exercised without a real Synaps API key or network
 * access. Always succeeds and returns deterministic, inspectable ids.
 */
@Injectable()
export class MockKycProvider implements KycProvider {
  public readonly sessions: Array<{ alias: string; fields: Record<string, string> }> = [];
  public readonly documents: KycDocumentUploadInput[] = [];

  private sessionCounter = 0;
  private documentCounter = 0;

  async createSession(alias: string, fields: Record<string, string>): Promise<KycSessionResult> {
    this.sessions.push({ alias, fields });
    this.sessionCounter += 1;
    return { ok: true, providerId: `mock-session-${this.sessionCounter}`, statusCode: 200 };
  }

  async uploadDocument(input: KycDocumentUploadInput): Promise<KycDocumentUploadResult> {
    this.documents.push(input);
    this.documentCounter += 1;
    return { ok: true, providerReference: `mock-document-${this.documentCounter}`, statusCode: 200 };
  }

  reset(): void {
    this.sessions.length = 0;
    this.documents.length = 0;
    this.sessionCounter = 0;
    this.documentCounter = 0;
  }
}
