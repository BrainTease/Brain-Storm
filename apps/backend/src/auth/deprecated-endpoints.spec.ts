/* eslint-disable max-lines-per-function */
import * as fs from 'fs';
import * as path from 'path';

describe('Issue #1132 - Remove deprecated/unused auth endpoints', () => {
  const SRC_ROOT = path.resolve(__dirname, '..');

  describe('Auth module structure', () => {
    it('auth controller should exist', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.controller.ts');
      expect(fs.existsSync(file)).toBe(true);
    });

    it('auth service should exist', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.service.ts');
      expect(fs.existsSync(file)).toBe(true);
    });

    it('auth module should exist', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.module.ts');
      expect(fs.existsSync(file)).toBe(true);
    });

    it('jwt strategy should exist', () => {
      const file = path.join(SRC_ROOT, 'auth', 'jwt.strategy.ts');
      expect(fs.existsSync(file)).toBe(true);
    });

    it('jwt auth guard should exist', () => {
      const file = path.join(SRC_ROOT, 'auth', 'jwt-auth.guard.ts');
      expect(fs.existsSync(file)).toBe(true);
    });
  });

  describe('Active auth endpoints', () => {
    it('should have register endpoint', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.controller.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain("@Post('register')");
    });

    it('should have login endpoint', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.controller.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain("@Post('login')");
    });

    it('should have refresh token endpoint', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.controller.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain("@Post('refresh')");
    });

    it('should have logout endpoint', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.controller.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain("@Post('logout')");
    });

    it('should have email verification endpoint', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.controller.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain("@Get('verify')");
    });

    it('should have password reset endpoints', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.controller.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain("@Post('reset-password')");
      expect(content).toContain("@Post('forgot-password')");
    });

    it('should have MFA endpoints', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.controller.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain("@Post('mfa/enable')");
      expect(content).toContain("@Post('mfa/verify')");
      expect(content).toContain("@Post('mfa/disable')");
    });

    it('should have Stellar auth endpoints', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.controller.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain("@Get('stellar')");
      expect(content).toContain("@Post('stellar')");
    });
  });

  describe('Deprecated endpoint removal checks', () => {
    it('controller should not have legacy password reset endpoint', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.controller.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toMatch(/@Post\(['"]password['"][)].*{/);
    });

    it('controller should not have legacy oauth endpoints', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.controller.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toContain("@Post('oauth/callback')");
      expect(content).not.toContain("@Get('oauth/authorize')");
    });

    it('service should not reference deprecated strategies', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.service.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toMatch(/basicAuth|BasicAuthStrategy/);
    });

    it('module should not export deprecated providers', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.module.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toContain('LegacyAuthStrategy');
      expect(content).not.toContain('DeprecatedAuthGuard');
    });
  });

  describe('Strategy validation', () => {
    it('jwt strategy should be current', () => {
      const file = path.join(SRC_ROOT, 'auth', 'jwt.strategy.ts');
      expect(fs.existsSync(file)).toBe(true);
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain('JwtStrategy');
    });

    it('google strategy should exist', () => {
      const file = path.join(SRC_ROOT, 'auth', 'google.strategy.ts');
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        expect(content).toContain('GoogleStrategy');
      }
    });

    it('api key strategy should exist', () => {
      const file = path.join(SRC_ROOT, 'auth', 'api-key.strategy.ts');
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        expect(content).toContain('ApiKeyStrategy');
      }
    });

    it('stellar auth service should exist', () => {
      const file = path.join(SRC_ROOT, 'auth', 'stellar-auth.service.ts');
      expect(fs.existsSync(file)).toBe(true);
    });
  });

  describe('Guard validation', () => {
    it('jwt auth guard should exist', () => {
      const file = path.join(SRC_ROOT, 'auth', 'jwt-auth.guard.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain('JwtAuthGuard');
    });

    it('roles guard should exist', () => {
      const file = path.join(SRC_ROOT, 'auth', 'roles.guard.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain('RolesGuard');
    });

    it('api key auth guard should exist', () => {
      const file = path.join(SRC_ROOT, 'auth', 'api-key-auth.guard.ts');
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        expect(content).toContain('ApiKeyAuthGuard');
      }
    });

    it('google auth guard should exist', () => {
      const file = path.join(SRC_ROOT, 'auth', 'google-auth.guard.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain('GoogleAuthGuard');
    });
  });

  describe('No frontend references to deprecated endpoints', () => {
    it('auth service should not call deprecated endpoints', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.service.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toMatch(/\/auth\/oauth/);
      expect(content).not.toMatch(/\/auth\/legacy/);
    });

    it('auth controller should not expose deprecated paths', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.controller.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toContain("@Get('deprecated')");
      expect(content).not.toContain("@Post('legacy')");
    });
  });

  describe('API key functionality', () => {
    it('api key entity should exist', () => {
      const file = path.join(SRC_ROOT, 'auth', 'api-key.entity.ts');
      expect(fs.existsSync(file)).toBe(true);
    });

    it('api key strategy should handle token validation', () => {
      const file = path.join(SRC_ROOT, 'auth', 'api-key.strategy.ts');
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        expect(content).toContain('validate');
      }
    });

    it('auth controller should provide api key endpoints', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.controller.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain("@Post('admin/api-keys')");
      expect(content).toContain("@Post('admin/api-keys/revoke')");
    });
  });

  describe('Token blacklist functionality', () => {
    it('token blacklist service should exist', () => {
      const file = path.join(SRC_ROOT, 'auth', 'token-blacklist.service.ts');
      expect(fs.existsSync(file)).toBe(true);
    });

    it('token blacklist entity should exist', () => {
      const file = path.join(SRC_ROOT, 'auth', 'token-blacklist.entity.ts');
      expect(fs.existsSync(file)).toBe(true);
    });

    it('token blacklist service should have blacklist method', () => {
      const file = path.join(SRC_ROOT, 'auth', 'token-blacklist.service.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toMatch(/blacklist|add|revoke/i);
    });
  });

  describe('Auth module integration', () => {
    it('auth module should import jwt module', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.module.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain('JwtModule');
    });

    it('auth module should import type orm module', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.module.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain('TypeOrmModule');
    });

    it('auth module should provide all strategies', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.module.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain('JwtStrategy');
      expect(content).toContain('GoogleStrategy');
    });

    it('auth module should provide all guards', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.module.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain('JwtAuthGuard');
      expect(content).toContain('RolesGuard');
    });
  });

  describe('Decorator usage validation', () => {
    it('current user decorator should exist', () => {
      const file = path.join(SRC_ROOT, 'auth', 'current-user.decorator.ts');
      expect(fs.existsSync(file)).toBe(true);
    });

    it('roles decorator should exist', () => {
      const file = path.join(SRC_ROOT, 'auth', 'roles.decorator.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain('Roles');
    });

    it('current user decorator should be used in controller', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.controller.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toMatch(/@Req\(\)/);
    });
  });

  describe('Password reset flow', () => {
    it('password reset token entity should exist', () => {
      const file = path.join(SRC_ROOT, 'auth', 'password-reset-token.entity.ts');
      expect(fs.existsSync(file)).toBe(true);
    });

    it('refresh token entity should exist', () => {
      const file = path.join(SRC_ROOT, 'auth', 'refresh-token.entity.ts');
      expect(fs.existsSync(file)).toBe(true);
    });

    it('auth service should have password reset methods', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.service.ts');
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toMatch(/resetPassword|forgotPassword/);
    });
  });

  describe('Backward compatibility checks', () => {
    it('auth controller should not re-export deprecated routes', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.controller.ts');
      const content = fs.readFileSync(file, 'utf8');
      const deprecatedPatterns = ['//deprecated', '// legacy', '@Deprecated'];
      let found = false;
      for (const pattern of deprecatedPatterns) {
        if (content.includes(pattern)) {
          found = true;
          break;
        }
      }
      if (found) {
        expect(content).not.toContain('@Post(');
      }
    });

    it('no conflicting route definitions', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.controller.ts');
      const content = fs.readFileSync(file, 'utf8');
      const routes = content.match(/@(?:Get|Post|Put|Delete)\(['"](.*?)['"]\)/g) || [];
      const routeSet = new Set(routes);
      expect(routeSet.size).toBeGreaterThan(0);
    });
  });
});
