/**
 * Auth Module – Modularization Tests (Issue #801)
 *
 * Verifies:
 * 1. Sub-folder barrels (guards/, strategies/, decorators/, entities/) exist
 *    and export the right symbols.
 * 2. The top-level auth/index.ts re-exports all public symbols.
 * 3. RolesGuard logic is exercised in isolation.
 * 4. @Roles / ROLES_KEY wire metadata correctly.
 *
 * NOTE: Guards that extend @nestjs/passport AuthGuard require the `passport`
 * package at runtime.  The tests that check those guards only verify that the
 * class is exported (i.e., is a function); they do NOT instantiate guards that
 * depend on passport to avoid coupling the test suite to a transitive dep.
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';

const AUTH_SRC = path.resolve(__dirname);

// ── 1. Barrel file existence checks ─────────────────────────────────────

describe('Auth module – barrel file structure (Issue #801)', () => {
  it('guards/index.ts exists', () => {
    expect(fs.existsSync(path.join(AUTH_SRC, 'guards', 'index.ts'))).toBe(true);
  });

  it('strategies/index.ts exists', () => {
    expect(fs.existsSync(path.join(AUTH_SRC, 'strategies', 'index.ts'))).toBe(true);
  });

  it('decorators/index.ts exists', () => {
    expect(fs.existsSync(path.join(AUTH_SRC, 'decorators', 'index.ts'))).toBe(true);
  });

  it('entities/index.ts exists', () => {
    expect(fs.existsSync(path.join(AUTH_SRC, 'entities', 'index.ts'))).toBe(true);
  });

  it('top-level index.ts exists', () => {
    expect(fs.existsSync(path.join(AUTH_SRC, 'index.ts'))).toBe(true);
  });
});

// ── 2. Barrel content checks (static, no imports) ────────────────────────

describe('Auth module – barrel re-export content', () => {
  it('guards/index.ts re-exports JwtAuthGuard', () => {
    const content = fs.readFileSync(
      path.join(AUTH_SRC, 'guards', 'index.ts'),
      'utf8',
    );
    expect(content).toMatch(/JwtAuthGuard/);
  });

  it('guards/index.ts re-exports RolesGuard', () => {
    const content = fs.readFileSync(
      path.join(AUTH_SRC, 'guards', 'index.ts'),
      'utf8',
    );
    expect(content).toMatch(/RolesGuard/);
  });

  it('guards/index.ts re-exports ApiKeyAuthGuard', () => {
    const content = fs.readFileSync(
      path.join(AUTH_SRC, 'guards', 'index.ts'),
      'utf8',
    );
    expect(content).toMatch(/ApiKeyAuthGuard/);
  });

  it('guards/index.ts re-exports GoogleAuthGuard', () => {
    const content = fs.readFileSync(
      path.join(AUTH_SRC, 'guards', 'index.ts'),
      'utf8',
    );
    expect(content).toMatch(/GoogleAuthGuard/);
  });

  it('strategies/index.ts re-exports JwtStrategy', () => {
    const content = fs.readFileSync(
      path.join(AUTH_SRC, 'strategies', 'index.ts'),
      'utf8',
    );
    expect(content).toMatch(/JwtStrategy/);
  });

  it('strategies/index.ts re-exports ApiKeyStrategy', () => {
    const content = fs.readFileSync(
      path.join(AUTH_SRC, 'strategies', 'index.ts'),
      'utf8',
    );
    expect(content).toMatch(/ApiKeyStrategy/);
  });

  it('strategies/index.ts re-exports GoogleStrategy', () => {
    const content = fs.readFileSync(
      path.join(AUTH_SRC, 'strategies', 'index.ts'),
      'utf8',
    );
    expect(content).toMatch(/GoogleStrategy/);
  });

  it('decorators/index.ts re-exports CurrentUser', () => {
    const content = fs.readFileSync(
      path.join(AUTH_SRC, 'decorators', 'index.ts'),
      'utf8',
    );
    expect(content).toMatch(/CurrentUser/);
  });

  it('decorators/index.ts re-exports Roles and ROLES_KEY', () => {
    const content = fs.readFileSync(
      path.join(AUTH_SRC, 'decorators', 'index.ts'),
      'utf8',
    );
    expect(content).toMatch(/Roles/);
    expect(content).toMatch(/ROLES_KEY/);
  });

  it('entities/index.ts re-exports all four entity types', () => {
    const content = fs.readFileSync(
      path.join(AUTH_SRC, 'entities', 'index.ts'),
      'utf8',
    );
    expect(content).toMatch(/ApiKey/);
    expect(content).toMatch(/RefreshToken/);
    expect(content).toMatch(/PasswordResetToken/);
    expect(content).toMatch(/TokenBlacklist/);
  });

  it('top-level index.ts re-exports AuthService and AuthModule', () => {
    const content = fs.readFileSync(
      path.join(AUTH_SRC, 'index.ts'),
      'utf8',
    );
    expect(content).toMatch(/AuthService/);
    expect(content).toMatch(/AuthModule/);
    expect(content).toMatch(/TokenBlacklistService/);
  });
});

// ── 3. Entities/decorators can be imported without full NestJS context ───

describe('Auth entities/decorators – importable without DI', () => {
  it('can require entity classes directly', () => {
    const { ApiKey } = require('./api-key.entity');
    const { RefreshToken } = require('./refresh-token.entity');
    const { PasswordResetToken } = require('./password-reset-token.entity');
    const { TokenBlacklist } = require('./token-blacklist.entity');
    expect(typeof ApiKey).toBe('function');
    expect(typeof RefreshToken).toBe('function');
    expect(typeof PasswordResetToken).toBe('function');
    expect(typeof TokenBlacklist).toBe('function');
  });

  it('can require decorator symbols directly', () => {
    const { CurrentUser } = require('./current-user.decorator');
    const { Roles, ROLES_KEY } = require('./roles.decorator');
    expect(CurrentUser).toBeDefined();
    expect(typeof Roles).toBe('function');
    expect(ROLES_KEY).toBe('roles');
  });
});

// ── 4. RolesGuard unit test ───────────────────────────────────────────────

describe('RolesGuard', () => {
  const { RolesGuard } = require('./roles.guard');
  let guard: typeof RolesGuard.prototype;
  let reflector: Reflector;

  const makeCtx = (
    user: any,
    handler: Function = () => {},
  ): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => () => {},
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext);

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows access when no roles are required', () => {
    expect(guard.canActivate(makeCtx({ role: 'student' }))).toBe(true);
  });

  it('denies access when user role does not match', () => {
    const handler = function testHandler() {};
    Reflect.defineMetadata('roles', ['admin'], handler);
    expect(guard.canActivate(makeCtx({ role: 'student' }, handler))).toBe(false);
  });

  it('allows access when user role matches', () => {
    const handler = function testHandler() {};
    Reflect.defineMetadata('roles', ['admin'], handler);
    expect(guard.canActivate(makeCtx({ role: 'admin' }, handler))).toBe(true);
  });

  it('denies when request has no user', () => {
    const handler = function testHandler() {};
    Reflect.defineMetadata('roles', ['admin'], handler);
    expect(guard.canActivate(makeCtx(null, handler))).toBe(false);
  });
});

// ── 5. @Roles decorator test ─────────────────────────────────────────────

describe('@Roles decorator', () => {
  it('sets roles metadata on a class method', () => {
    const { Roles, ROLES_KEY } = require('./roles.decorator');

    class TestController {}
    Reflect.defineMetadata('someMethod', undefined, TestController.prototype);

    // SetMetadata applies metadata to the target when used on method
    const decorator = Roles('admin', 'instructor');

    // Simulate applying the decorator to a class (class-level usage)
    decorator(TestController);
    const meta = Reflect.getMetadata(ROLES_KEY, TestController);
    expect(meta).toEqual(['admin', 'instructor']);
  });
});
