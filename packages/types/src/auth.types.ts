export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  stellarPublicKey?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
  expiresIn: number;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface PasswordResetDto {
  email: string;
}

export interface PasswordResetConfirmDto {
  token: string;
  newPassword: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface MfaSetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface MfaVerifyDto {
  token: string;
  code: string;
}

export interface StellarAuthChallengeDto {
  publicKey: string;
}

export interface StellarAuthResponse {
  challenge: string;
  networkPassphrase: string;
}

export interface StellarAuthVerifyDto {
  challenge: string;
  signature: string;
  publicKey: string;
}

export type AuthProvider = 'local' | 'google' | 'stellar';

export interface AuthSession {
  userId: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  mfaEnabled: boolean;
  provider: AuthProvider;
  sessionId: string;
  expiresAt: Date;
}

export interface ApiKeyDto {
  name: string;
  permissions: string[];
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  createdAt: Date;
  lastUsedAt?: Date;
}

export type UserRole = 'student' | 'instructor' | 'admin';
