/**
 * Auth fixtures for testing
 */

export interface TestAuthResponse {
  accessToken: string;
  refreshToken?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    roles?: string[];
  };
}

export interface TestLoginRequest {
  email: string;
  password: string;
  mfa_token?: string;
}

export interface TestRegisterRequest {
  email: string;
  password: string;
}

export const mockLoginRequest: TestLoginRequest = {
  email: 'student@example.com',
  password: 'password123',
};

export const mockRegisterRequest: TestRegisterRequest = {
  email: 'newuser@example.com',
  password: 'SecurePass123!',
};

export const mockAuthResponse: TestAuthResponse = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.access',
  refreshToken: 'refresh-token-123',
  user: {
    id: 'user-1',
    email: 'student@example.com',
    name: 'Test Student',
    roles: ['student'],
  },
};

export const mockInstructorAuthResponse: TestAuthResponse = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.instructor',
  refreshToken: 'refresh-token-456',
  user: {
    id: 'user-2',
    email: 'instructor@example.com',
    name: 'Test Instructor',
    roles: ['instructor'],
  },
};

export const mockAdminAuthResponse: TestAuthResponse = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.admin',
  refreshToken: 'refresh-token-789',
  user: {
    id: 'user-3',
    email: 'admin@example.com',
    name: 'Test Admin',
    roles: ['admin'],
  },
};
