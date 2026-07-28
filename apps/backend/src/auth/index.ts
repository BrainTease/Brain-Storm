/**
 * Auth Module – Public API
 *
 * Re-exports all public symbols of the auth module so that consumers outside
 * this module can import from a single, stable path:
 *
 *   import { JwtAuthGuard, Roles, CurrentUser } from '../auth';
 *
 * Internal implementation files (e.g. auth.service.ts) are NOT re-exported
 * here; other modules should depend on AuthModule rather than reaching into
 * the internals directly.
 *
 * Sub-folder barrels mirror a "concern-first" layout:
 *
 *   auth/
 *   ├── decorators/   – @CurrentUser, @Roles
 *   ├── entities/     – TypeORM entities owned by auth
 *   ├── guards/       – JwtAuthGuard, RolesGuard, ApiKeyAuthGuard, GoogleAuthGuard
 *   └── strategies/   – JWT, API-key, Google Passport strategies
 */

// Guards
export * from './guards/index';

// Strategies
export * from './strategies/index';

// Decorators
export * from './decorators/index';

// Entities
export * from './entities/index';

// Core services / module
export { AuthService } from './auth.service';
export { StellarAuthService } from './stellar-auth.service';
export { TokenBlacklistService } from './token-blacklist.service';
export { AuthModule } from './auth.module';
