import request from 'supertest';
import app from '../index';

describe('Response Envelope Standard', () => {
  const expectedEnvelopeShape = {
    success: expect.any(Boolean),
    data: expect.anything(),
    error: expect.any(Object),
    meta: {
      timestamp: expect.any(String),
      requestId: expect.any(String),
      version: expect.any(String),
    },
  };

  describe('GET /api/users', () => {
    it('should return standard envelope shape', async () => {
      const response = await request(app).get('/api/users');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(expectedEnvelopeShape);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.error).toBeNull();
      expect(response.body.meta.pagination).toBeDefined();
    });

    it('should include pagination metadata', async () => {
      const response = await request(app).get('/api/users?page=1&limit=10');

      expect(response.body.meta.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return standard envelope for existing user', async () => {
      const response = await request(app).get('/api/users/1');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(expectedEnvelopeShape);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: '1',
        name: expect.any(String),
        email: expect.any(String),
      });
      expect(response.body.error).toBeNull();
    });

    it('should return error envelope for non-existent user', async () => {
      const response = await request(app).get('/api/users/999');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject(expectedEnvelopeShape);
      expect(response.body.success).toBe(false);
      expect(response.body.data).toBeNull();
      expect(response.body.error).toMatchObject({
        code: 'NOT_FOUND',
        message: expect.any(String),
      });
    });
  });

  describe('POST /api/users', () => {
    it('should return standard envelope for successful creation', async () => {
      const newUser = { name: 'Test User', email: 'test@example.com' };
      const response = await request(app)
        .post('/api/users')
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject(expectedEnvelopeShape);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(newUser);
      expect(response.body.error).toBeNull();
    });

    it('should return error envelope for validation failure', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ name: 'Test User' }); // Missing email

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject(expectedEnvelopeShape);
      expect(response.body.success).toBe(false);
      expect(response.body.data).toBeNull();
      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: expect.any(String),
        details: expect.any(Object),
      });
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should return standard envelope for successful update', async () => {
      const updateData = { name: 'Updated Name' };
      const response = await request(app)
        .put('/api/users/1')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(expectedEnvelopeShape);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: '1',
        name: 'Updated Name',
      });
      expect(response.body.error).toBeNull();
    });

    it('should return error envelope for non-existent user', async () => {
      const response = await request(app)
        .put('/api/users/999')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject(expectedEnvelopeShape);
      expect(response.body.success).toBe(false);
      expect(response.body.data).toBeNull();
      expect(response.body.error).toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should return standard envelope for successful deletion', async () => {
      // First create a user
      const newUser = { name: 'Delete User', email: 'delete@example.com' };
      const createResponse = await request(app)
        .post('/api/users')
        .send(newUser);
      
      const userId = createResponse.body.data.id;

      const response = await request(app).delete(`/api/users/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(expectedEnvelopeShape);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        deleted: true,
        id: userId,
      });
      expect(response.body.error).toBeNull();
    });

    it('should return error envelope for non-existent user', async () => {
      const response = await request(app).delete('/api/users/999');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject(expectedEnvelopeShape);
      expect(response.body.success).toBe(false);
      expect(response.body.data).toBeNull();
      expect(response.body.error).toMatchObject({
        code: 'NOT_FOUND',
      });
    });
  });

  describe('Response envelope validation', () => {
    it('should always include required fields', async () => {
      const endpoints = [
        { method: 'GET', path: '/api/users' },
        { method: 'POST', path: '/api/users' },
        { method: 'GET', path: '/api/users/1' },
        { method: 'PUT', path: '/api/users/1' },
        { method: 'DELETE', path: '/api/users/1' },
      ];

      const newUser = { name: 'Test', email: 'test@example.com' };

      for (const endpoint of endpoints) {
        let response;
        if (endpoint.method === 'POST' && endpoint.path === '/api/users') {
          response = await request(app)
            .post(endpoint.path)
            .send(newUser);
        } else if (endpoint.method === 'PUT') {
          response = await request(app)
            .put(endpoint.path)
            .send({ name: 'Updated' });
        } else if (endpoint.method === 'DELETE') {
          // Skip delete test as it would modify data
          continue;
        } else {
          response = await request(app)
            .get(endpoint.path);
        }

        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('meta');
        expect(response.body.meta).toHaveProperty('timestamp');
        expect(response.body.meta).toHaveProperty('requestId');
        expect(response.body.meta).toHaveProperty('version');
      }
    });
  });
});
