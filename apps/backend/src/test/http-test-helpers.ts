/**
 * Helper utilities for HTTP integration tests
 * 
 * Provides common operations for auth, user creation, and cleanup.
 */

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { TestUserData } from './http-fixtures';

/**
 * Register a new user via HTTP POST /auth/register
 */
export async function registerUser(
  app: INestApplication,
  userData: TestUserData
): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
    })
    .expect(201);

  return {
    accessToken: response.body.access_token,
    refreshToken: response.body.refresh_token,
    userId: response.body.user?.id || response.body.userId,
  };
}

/**
 * Login a user via HTTP POST /auth/login
 */
export async function loginUser(
  app: INestApplication,
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    accessToken: response.body.access_token,
    refreshToken: response.body.refresh_token,
    userId: response.body.user?.id || response.body.userId,
  };
}

/**
 * Get current user profile via HTTP GET /users/me
 */
export async function getCurrentUser(app: INestApplication, accessToken: string) {
  const response = await request(app.getHttpServer())
    .get('/users/me')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  return response.body;
}

/**
 * Clean all data from a table
 */
export async function cleanTable(dataSource: DataSource, tableName: string): Promise<void> {
  await dataSource.query(`DELETE FROM "${tableName}"`);
}

/**
 * Clean multiple tables in order (respects foreign key constraints)
 */
export async function cleanDatabase(dataSource: DataSource): Promise<void> {
  const tables = [
    'refresh_token',
    'password_reset_token',
    'email_verification_token',
    'api_key',
    'mfa_backup_code',
    'user',
  ];

  for (const table of tables) {
    try {
      await cleanTable(dataSource, table);
    } catch (error) {
      // Table might not exist, ignore
    }
  }
}

/**
 * Wait for a condition to be true (for async operations)
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error('Timeout waiting for condition');
}

/**
 * Extract error message from response
 */
export function getErrorMessage(response: request.Response): string {
  return response.body?.message || response.body?.error || 'Unknown error';
}

/**
 * Assert response has expected error structure
 */
export function expectErrorResponse(
  response: request.Response,
  expectedStatus: number,
  expectedMessagePattern?: string | RegExp
) {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('message');

  if (expectedMessagePattern) {
    if (typeof expectedMessagePattern === 'string') {
      expect(response.body.message).toContain(expectedMessagePattern);
    } else {
      expect(response.body.message).toMatch(expectedMessagePattern);
    }
  }
}
