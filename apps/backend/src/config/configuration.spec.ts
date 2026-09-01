import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { validationSchema } from './validation.schema';
import configuration from './configuration';

describe('Configuration Module — Fail-Fast Startup Validation', () => {
  it('should succeed with all required environment variables', async () => {
    process.env.DATABASE_HOST = 'localhost';
    process.env.DATABASE_USER = 'test';
    process.env.DATABASE_PASSWORD = 'test';
    process.env.DATABASE_NAME = 'test';
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.EMAIL_HOST = 'smtp.example.com';
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'password';
    process.env.STELLAR_SECRET_KEY = 'test-secret-key';

    @Module({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          validationSchema,
          validationOptions: { abortEarly: false },
        }),
      ],
    })
    class TestModule {}

    const module = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    const configService = module.get<ConfigService>(ConfigService);
    expect(configService.get<number>('port')).toBe(3000);
  });

  it('should fail fast when required DATABASE_HOST is missing', async () => {
    delete process.env.DATABASE_HOST;
    process.env.DATABASE_USER = 'test';
    process.env.DATABASE_PASSWORD = 'test';
    process.env.DATABASE_NAME = 'test';
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.EMAIL_HOST = 'smtp.example.com';
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'password';
    process.env.STELLAR_SECRET_KEY = 'test-secret-key';

    @Module({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          validationSchema,
          validationOptions: { abortEarly: false },
        }),
      ],
    })
    class TestModule {}

    await expect(
      Test.createTestingModule({
        imports: [TestModule],
      }).compile()
    ).rejects.toThrow();
  });

  it('should fail fast when JWT_SECRET is too short', async () => {
    process.env.DATABASE_HOST = 'localhost';
    process.env.DATABASE_USER = 'test';
    process.env.DATABASE_PASSWORD = 'test';
    process.env.DATABASE_NAME = 'test';
    process.env.JWT_SECRET = 'short'; // Too short (< 16 chars)
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.EMAIL_HOST = 'smtp.example.com';
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'password';
    process.env.STELLAR_SECRET_KEY = 'test-secret-key';

    @Module({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          validationSchema,
          validationOptions: { abortEarly: false },
        }),
      ],
    })
    class TestModule {}

    await expect(
      Test.createTestingModule({
        imports: [TestModule],
      }).compile()
    ).rejects.toThrow();
  });

  it('should provide centralized config values via ConfigService', async () => {
    process.env.DATABASE_HOST = 'localhost';
    process.env.DATABASE_USER = 'test';
    process.env.DATABASE_PASSWORD = 'test';
    process.env.DATABASE_NAME = 'test';
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.EMAIL_HOST = 'smtp.example.com';
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'password';
    process.env.STELLAR_SECRET_KEY = 'test-secret-key';
    process.env.RATE_LIMIT_ADMIN = '5000';
    process.env.AUDIT_RETENTION_DAYS = '180';
    process.env.SHUTDOWN_DRAIN_TIMEOUT_MS = '15000';

    @Module({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          validationSchema,
          validationOptions: { abortEarly: false },
        }),
      ],
    })
    class TestModule {}

    const module = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    const configService = module.get<ConfigService>(ConfigService);

    expect(configService.get<number>('rateLimit.admin')).toBe(5000);
    expect(configService.get<number>('audit.retentionDays')).toBe(180);
    expect(configService.get<number>('shutdown.drainTimeoutMs')).toBe(15000);
    expect(configService.get<boolean>('mail.enabled')).toBe(false);
  });

  it('should use defaults when optional env vars are not set', async () => {
    process.env.DATABASE_HOST = 'localhost';
    process.env.DATABASE_USER = 'test';
    process.env.DATABASE_PASSWORD = 'test';
    process.env.DATABASE_NAME = 'test';
    process.env.JWT_SECRET = 'test-secret-that-is-long-enough';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.EMAIL_HOST = 'smtp.example.com';
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'password';
    process.env.STELLAR_SECRET_KEY = 'test-secret-key';
    delete process.env.RATE_LIMIT_ADMIN;
    delete process.env.AUDIT_RETENTION_DAYS;

    @Module({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          validationSchema,
          validationOptions: { abortEarly: false },
        }),
      ],
    })
    class TestModule {}

    const module = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    const configService = module.get<ConfigService>(ConfigService);

    expect(configService.get<number>('rateLimit.admin')).toBe(10000); // default
    expect(configService.get<number>('audit.retentionDays')).toBe(365); // default
    expect(configService.get<number>('shutdown.drainTimeoutMs')).toBe(10000); // default
  });
});
