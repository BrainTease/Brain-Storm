/**
 * Credential fixtures for testing
 */

export interface TestCredential {
  id: string;
  userId: string;
  courseId: string;
  courseTitle: string;
  status: 'issued' | 'pending' | 'revoked';
  issuedAt?: string;
  expiresAt?: string;
  credentialUrl?: string;
  blockchainTxHash?: string;
}

export const mockIssuedCredential: TestCredential = {
  id: 'cred-1',
  userId: 'user-1',
  courseId: 'course-1',
  courseTitle: 'Blockchain Basics',
  status: 'issued',
  issuedAt: '2024-01-15T00:00:00.000Z',
  credentialUrl: 'https://credentials.brain-storm.com/cred-1',
  blockchainTxHash: '0x123abc',
};

export const mockPendingCredential: TestCredential = {
  id: 'cred-2',
  userId: 'user-1',
  courseId: 'course-2',
  courseTitle: 'Smart Contracts on Stellar',
  status: 'pending',
};

export const mockRevokedCredential: TestCredential = {
  id: 'cred-3',
  userId: 'user-1',
  courseId: 'course-3',
  courseTitle: 'Old Course',
  status: 'revoked',
  issuedAt: '2023-06-01T00:00:00.000Z',
  credentialUrl: 'https://credentials.brain-storm.com/cred-3',
};

export const mockCredentials = [mockIssuedCredential, mockPendingCredential];
