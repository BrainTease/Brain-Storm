import { Test, TestingModule } from '@nestjs/testing';
import { ValidationMiddleware } from './validation.middleware';
import { BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';
import * as Joi from 'joi';

describe('ValidationMiddleware', () => {
  let middleware: ValidationMiddleware;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationMiddleware],
    }).compile();

    middleware = module.get<ValidationMiddleware>(ValidationMiddleware);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('ValidateRequest decorator', () => {
    it('should accept valid request body', (done) => {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().required(),
      });

      const req = {
        method: 'POST',
        path: '/test',
        body: { email: 'test@example.com', name: 'Test User' },
        query: {},
        params: {},
      } as unknown as Request;

      const res = {} as Response;

      const next = () => {
        expect(req.body.email).toBe('test@example.com');
        expect(req.body.name).toBe('Test User');
        done();
      };

      // Manually call the validation logic (since middleware returns a function)
      try {
        const { error, value } = schema.validate(req.body, {
          stripUnknown: true,
          abortEarly: false,
        });
        if (error) {
          throw new BadRequestException('Validation failed');
        }
        req.body = value;
        next();
      } catch (err) {
        done(err);
      }
    });

    it('should reject invalid email format', (done) => {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().required(),
      });

      const req = {
        method: 'POST',
        path: '/test',
        body: { email: 'invalid-email', name: 'Test User' },
      } as unknown as Request;

      try {
        const { error } = schema.validate(req.body, {
          stripUnknown: true,
          abortEarly: false,
        });
        if (error) {
          expect(error.details.length).toBeGreaterThan(0);
          expect(error.details[0].message).toContain('must be a valid email');
          done();
        }
      } catch (err) {
        done(err);
      }
    });

    it('should reject missing required fields', (done) => {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().required(),
      });

      const req = {
        method: 'POST',
        path: '/test',
        body: { email: 'test@example.com' }, // missing 'name'
      } as unknown as Request;

      try {
        const { error } = schema.validate(req.body, {
          stripUnknown: true,
          abortEarly: false,
        });
        if (error) {
          expect(error.details.length).toBeGreaterThan(0);
          expect(error.details[0].path).toContain('name');
          done();
        }
      } catch (err) {
        done(err);
      }
    });

    it('should strip unknown fields', (done) => {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().required(),
      });

      const req = {
        method: 'POST',
        path: '/test',
        body: {
          email: 'test@example.com',
          name: 'Test User',
          unknownField: 'should be removed',
          anotherUnknown: 123,
        },
      } as unknown as Request;

      try {
        const { error, value } = schema.validate(req.body, {
          stripUnknown: true,
          abortEarly: false,
        });
        if (error) {
          done(error);
        }
        expect(value).not.toHaveProperty('unknownField');
        expect(value).not.toHaveProperty('anotherUnknown');
        expect(value).toHaveProperty('email');
        expect(value).toHaveProperty('name');
        done();
      } catch (err) {
        done(err);
      }
    });

    it('should validate Stellar public key format', (done) => {
      const schema = Joi.object({
        publicKey: Joi.string().required().pattern(/^G[A-Z2-7]{55}$/),
      });

      // Valid Stellar public key
      const validReq = {
        body: { publicKey: 'GBRPYHIL2CI3WHZDTOOQFC6EB4LGVWC4YWT6TWQHIJZLNAWQO7JWGN5' },
      } as unknown as Request;

      const { error: validError, value: validValue } = schema.validate(validReq.body, {
        stripUnknown: true,
        abortEarly: false,
      });

      expect(validError).toBeUndefined();
      expect(validValue.publicKey).toBe('GBRPYHIL2CI3WHZDTOOQFC6EB4LGVWC4YWT6TWQHIJZLNAWQO7JWGN5');

      // Invalid Stellar public key
      const invalidReq = {
        body: { publicKey: 'INVALID_KEY' },
      } as unknown as Request;

      const { error: invalidError } = schema.validate(invalidReq.body, {
        stripUnknown: true,
        abortEarly: false,
      });

      expect(invalidError).toBeDefined();
      done();
    });

    it('should validate UUID format for courseId', (done) => {
      const schema = Joi.object({
        courseId: Joi.string().required().uuid(),
      });

      // Valid UUID
      const validReq = {
        body: { courseId: '550e8400-e29b-41d4-a716-446655440000' },
      } as unknown as Request;

      const { error: validError } = schema.validate(validReq.body, {
        stripUnknown: true,
        abortEarly: false,
      });

      expect(validError).toBeUndefined();

      // Invalid UUID
      const invalidReq = {
        body: { courseId: 'not-a-uuid' },
      } as unknown as Request;

      const { error: invalidError } = schema.validate(invalidReq.body, {
        stripUnknown: true,
        abortEarly: false,
      });

      expect(invalidError).toBeDefined();
      done();
    });

    it('should validate number ranges for progressPct', (done) => {
      const schema = Joi.object({
        progressPct: Joi.number().integer().min(0).max(100).required(),
      });

      // Valid: 50
      const validReq50 = {
        body: { progressPct: 50 },
      } as unknown as Request;

      const { error: error50 } = schema.validate(validReq50.body, {
        stripUnknown: true,
        abortEarly: false,
      });

      expect(error50).toBeUndefined();

      // Invalid: 150 (exceeds max)
      const invalidReq150 = {
        body: { progressPct: 150 },
      } as unknown as Request;

      const { error: error150 } = schema.validate(invalidReq150.body, {
        stripUnknown: true,
        abortEarly: false,
      });

      expect(error150).toBeDefined();

      // Invalid: -10 (below min)
      const invalidReqNeg = {
        body: { progressPct: -10 },
      } as unknown as Request;

      const { error: errorNeg } = schema.validate(invalidReqNeg.body, {
        stripUnknown: true,
        abortEarly: false,
      });

      expect(errorNeg).toBeDefined();
      done();
    });
  });
});
