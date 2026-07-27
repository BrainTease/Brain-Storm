import { Pact, Matchers } from '@pact-foundation/pact';
import axios from 'axios';

const provider = new Pact({
  consumer: 'BrainStormFrontend',
  provider: 'BrainStormBackend',
  port: 8991,
});

describe('Auth API Contract', () => {
  beforeAll(() => provider.setup());
  afterEach(() => provider.verify());
  afterAll(() => provider.finalize());

  describe('POST /v1/auth/register', () => {
    it('should register a new user', async () => {
      const expectedBody = {
        id: Matchers.uuid(),
        email: 'test@example.com',
        username: 'testuser',
        createdAt: Matchers.iso8601DateTime(),
      };

      await provider.addInteraction({
        state: 'user does not exist',
        uponReceiving: 'a request to register a new user',
        withRequest: {
          method: 'POST',
          path: '/v1/auth/register',
          body: {
            email: 'test@example.com',
            password: 'SecurePass123!',
            username: 'testuser',
          },
          headers: {
            'Content-Type': 'application/json',
          },
        },
        willRespondWith: {
          status: 201,
          body: expectedBody,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      });

      const response = await axios.post('http://localhost:8991/v1/auth/register', {
        email: 'test@example.com',
        password: 'SecurePass123!',
        username: 'testuser',
      });

      expect(response.status).toBe(201);
      expect(response.data.email).toBe('test@example.com');
    });
  });

  describe('POST /v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const expectedBody = {
        accessToken: Matchers.regex(/^[A-Za-z0-9-._~+/]+=*$/),
        refreshToken: Matchers.regex(/^[A-Za-z0-9-._~+/]+=*$/),
        user: {
          id: Matchers.uuid(),
          email: 'user@example.com',
        },
      };

      await provider.addInteraction({
        state: 'user exists with valid credentials',
        uponReceiving: 'a request to login',
        withRequest: {
          method: 'POST',
          path: '/v1/auth/login',
          body: {
            email: 'user@example.com',
            password: 'SecurePass123!',
          },
          headers: {
            'Content-Type': 'application/json',
          },
        },
        willRespondWith: {
          status: 200,
          body: expectedBody,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      });

      const response = await axios.post('http://localhost:8991/v1/auth/login', {
        email: 'user@example.com',
        password: 'SecurePass123!',
      });

      expect(response.status).toBe(200);
      expect(response.data.accessToken).toBeDefined();
      expect(response.data.refreshToken).toBeDefined();
    });
  });
});
