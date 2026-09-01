import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitMiddleware, RateLimitPresets } from './rate-limit.middleware';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Request, Response } from 'express';

describe('RateLimitMiddleware', () => {
  let middleware: RateLimitMiddleware;
  let mockCache: any;

  beforeEach(async () => {
    // Create a mock cache
    mockCache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitMiddleware,
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
      ],
    }).compile();

    middleware = module.get<RateLimitMiddleware>(RateLimitMiddleware);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('createMiddleware', () => {
    it('should allow requests within limit', async () => {
      const options = {
        limit: 5,
        windowMs: 60000,
      };

      const mw = middleware.createMiddleware(options);

      const req = {
        headers: {},
        ip: '127.0.0.1',
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      } as unknown as Response;

      const next = jest.fn();

      mockCache.get.mockResolvedValueOnce(undefined); // First request

      await mw(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalledWith(expect.stringContaining('ratelimit:ip'), 1, 60000);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
    });

    it('should reject requests exceeding limit', async () => {
      const options = {
        limit: 2,
        windowMs: 60000,
      };

      const mw = middleware.createMiddleware(options);

      const req = {
        headers: {},
        ip: '127.0.0.1',
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      } as unknown as Response;

      const next = jest.fn();

      // Simulate that limit has been exceeded
      mockCache.get.mockResolvedValueOnce(3); // Current count is 3

      await mw(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 429,
        })
      );
    });

    it('should extract client IP from X-Forwarded-For header', async () => {
      const options = {
        limit: 5,
        windowMs: 60000,
      };

      const mw = middleware.createMiddleware(options);

      const req = {
        headers: { 'x-forwarded-for': '192.168.1.100, 10.0.0.1' },
        ip: '127.0.0.1',
      } as unknown as Request;

      const res = {
        setHeader: jest.fn(),
      } as unknown as Response;

      const next = jest.fn();

      mockCache.get.mockResolvedValueOnce(undefined);

      await mw(req, res, next);

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('192.168.1.100'),
        1,
        60000
      );
    });

    it('should use account ID for authenticated requests', async () => {
      const options = {
        limit: 5,
        windowMs: 60000,
        useAccountId: true,
      };

      const mw = middleware.createMiddleware(options);

      const req = {
        headers: {},
        ip: '127.0.0.1',
        user: { id: 'user123' },
      } as unknown as Request;

      const res = {
        setHeader: jest.fn(),
      } as unknown as Response;

      const next = jest.fn();

      mockCache.get.mockResolvedValueOnce(undefined);

      await mw(req, res, next);

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('account:user123'),
        1,
        60000
      );
    });

    it('should skip middleware if skip function returns true', async () => {
      const options = {
        limit: 5,
        windowMs: 60000,
        skip: (req: Request) => req.path === '/health',
      };

      const mw = middleware.createMiddleware(options);

      const req = {
        headers: {},
        ip: '127.0.0.1',
        path: '/health',
      } as unknown as Request;

      const res = {} as Response;
      const next = jest.fn();

      await mw(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(mockCache.get).not.toHaveBeenCalled();
    });

    it('should use custom key generator', async () => {
      const customKey = 'custom-key';
      const options = {
        limit: 5,
        windowMs: 60000,
        keyGenerator: () => customKey,
      };

      const mw = middleware.createMiddleware(options);

      const req = {
        headers: {},
        ip: '127.0.0.1',
      } as unknown as Request;

      const res = {
        setHeader: jest.fn(),
      } as unknown as Response;

      const next = jest.fn();

      mockCache.get.mockResolvedValueOnce(undefined);

      await mw(req, res, next);

      expect(mockCache.set).toHaveBeenCalledWith(customKey, 1, 60000);
    });

    it('should use custom message when limit exceeded', async () => {
      const customMessage = 'Custom rate limit message';
      const options = {
        limit: 1,
        windowMs: 60000,
        message: customMessage,
      };

      const mw = middleware.createMiddleware(options);

      const req = {
        headers: {},
        ip: '127.0.0.1',
      } as unknown as Request;

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      } as unknown as Response;

      const next = jest.fn();

      // Simulate that limit has been exceeded
      mockCache.get.mockResolvedValueOnce(2);

      await mw(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: customMessage,
        })
      );
    });
  });

  describe('RateLimitPresets', () => {
    it('should have valid public preset', () => {
      expect(RateLimitPresets.public).toEqual({
        limit: 1000,
        windowMs: 60 * 60 * 1000,
      });
    });

    it('should have valid transaction preset', () => {
      expect(RateLimitPresets.transaction).toEqual({
        limit: 50,
        windowMs: 60 * 60 * 1000,
        message: 'Transaction submission limit exceeded. Please try again later.',
      });
    });

    it('should have valid auth preset', () => {
      expect(RateLimitPresets.auth).toEqual({
        limit: 5,
        windowMs: 15 * 60 * 1000,
        message: 'Too many login attempts. Please try again later.',
      });
    });

    it('should have valid testnetFunding preset', () => {
      expect(RateLimitPresets.testnetFunding).toEqual({
        limit: 3,
        windowMs: 60 * 60 * 1000,
        message: 'Testnet funding limit reached. Please try again later.',
      });
    });
  });
});
