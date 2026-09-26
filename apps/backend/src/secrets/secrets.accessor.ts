import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Central accessor for secret-shaped environment variables (credentials,
 * tokens, keys, connection strings with embedded auth). Modules should read
 * secrets through this service instead of `process.env` directly so that
 * rotation and access auditing stay centralized in one place.
 *
 * Non-secret configuration (feature flags, numeric tuning values, hostnames
 * without credentials) should continue to use `ConfigService` / plain env
 * reads and is out of scope for this accessor.
 */
@Injectable()
export class SecretsAccessor {
  constructor(private readonly configService: ConfigService) {}

  get(key: string): string | undefined {
    return this.configService.get<string>(key);
  }

  getOrThrow(key: string): string {
    const value = this.configService.get<string>(key);
    if (value === undefined || value === '') {
      throw new Error(`Missing required secret: ${key}`);
    }
    return value;
  }

  getBoolean(key: string, defaultValue = false): boolean {
    const value = this.configService.get<string>(key);
    if (value === undefined) return defaultValue;
    return value === 'true';
  }
}
