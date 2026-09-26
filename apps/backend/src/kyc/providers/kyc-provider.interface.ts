/**
 * Injection token for the active KycProvider implementation.
 * Bound in KycModule; swap the binding to point at a different provider
 * (or the in-memory mock) without touching KycService.
 */
export const KYC_PROVIDER = Symbol('KYC_PROVIDER');

export interface KycSessionResult {
  /** Provider-assigned session/customer identifier, if the call succeeded. */
  providerId: string | null;
  /** Whether the provider accepted the submission. */
  ok: boolean;
  /** HTTP-ish status code returned by the provider, when available. */
  statusCode?: number;
}

export interface KycDocumentUploadResult {
  /** Provider-assigned document reference, if the call succeeded. */
  providerReference: string | null;
  ok: boolean;
  statusCode?: number;
}

export interface KycDocumentUploadInput {
  stellarPublicKey: string;
  filename: string;
  mimetype: string;
  contentBase64: string;
}

/**
 * Abstraction over a third-party KYC/AML verification provider (e.g. Synaps).
 *
 * KycService depends only on this interface so the underlying vendor can be
 * swapped, and so unit tests can inject an in-memory implementation instead
 * of mocking global fetch.
 */
export interface KycProvider {
  /**
   * Create or update a verification session for a customer.
   * Must never throw for ordinary provider-side failures (non-2xx, network
   * errors) — those are reported via `ok`/`statusCode` so KYC submission
   * remains non-fatal from the caller's perspective, matching existing
   * behavior.
   */
  createSession(alias: string, fields: Record<string, string>): Promise<KycSessionResult>;

  /**
   * Submit a document for a customer's verification session.
   */
  uploadDocument(input: KycDocumentUploadInput): Promise<KycDocumentUploadResult>;
}
