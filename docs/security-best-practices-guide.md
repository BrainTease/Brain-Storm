# Security Best Practices Guide

Comprehensive security guidelines for developers, operators, and contributors to Brain-Storm.

---

## Table of Contents

1. [Security Principles](#security-principles)
2. [Secure Coding Practices](#secure-coding-practices)
3. [Authentication Guide](#authentication-guide)
4. [Authorization Patterns](#authorization-patterns)
5. [Security Checklist](#security-checklist)
6. [Security Incident Procedures](#security-incident-procedures)

---

## Security Principles

### Defense in Depth

Implement multiple layers of security controls. Never rely on a single mechanism:

- **Network layer:** Firewalls, VPCs, rate limiting
- **Application layer:** Input validation, authentication, authorization
- **Data layer:** Encryption, access controls, audit logging
- **Infrastructure layer:** Secrets management, secure defaults

### Principle of Least Privilege

Grant users and services only the minimum permissions required:

```typescript
// ✅ Good: Specific role required
@Get('admin/users')
@Roles(Role.Admin)
@UseGuards(JwtAuthGuard, RolesGuard)
async getUsers() { }

// ❌ Bad: No role check
@Get('admin/users')
async getUsers() { }
```

### Fail Securely

When security checks fail, deny access by default:

```typescript
// ✅ Good: Deny by default
if (!user.hasPermission('edit_course')) {
  throw new ForbiddenException('Insufficient permissions');
}

// ❌ Bad: Allow by default
if (user.hasPermission('edit_course')) {
  // allow
} else {
  // still allow (implicit)
}
```

### Security by Design

Build security into the architecture from the start:

- Use HTTPS/TLS for all communications
- Encrypt sensitive data at rest and in transit
- Implement audit logging for sensitive operations
- Use secure defaults (e.g., `httpOnly` cookies, CORS restrictions)

---

## Secure Coding Practices

### Input Validation & Sanitization

Always validate and sanitize user input:

```typescript
// Backend: NestJS with class-validator
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

// Apply validation
@Post('register')
async register(@Body() dto: CreateUserDto) {
  // DTO validation happens automatically
}
```

```typescript
// Frontend: Sanitize before rendering
import DOMPurify from 'dompurify';

function UserProfile({ bio }) {
  const sanitized = DOMPurify.sanitize(bio);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### SQL Injection Prevention

Use parameterized queries (TypeORM handles this automatically):

```typescript
// ✅ Good: Parameterized query
const user = await this.userRepository.findOne({
  where: { email: userInput },
});

// ❌ Bad: String concatenation
const user = await this.userRepository.query(
  `SELECT * FROM users WHERE email = '${userInput}'`
);
```

### Cross-Site Scripting (XSS) Prevention

- Use React's built-in XSS protection (auto-escapes by default)
- Sanitize HTML content with `DOMPurify`
- Set Content Security Policy (CSP) headers

```typescript
// Backend: Set CSP headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  next();
});
```

### Cross-Site Request Forgery (CSRF) Prevention

Use CSRF tokens for state-changing operations:

```typescript
// Backend: Generate CSRF token
@Get('csrf-token')
getCsrfToken(@Req() req) {
  return { token: req.csrfToken() };
}

// Frontend: Include CSRF token in requests
const response = await axios.post('/api/courses', courseData, {
  headers: { 'X-CSRF-Token': csrfToken },
});
```

### Secure Password Handling

- Hash passwords with bcrypt (minimum 10 rounds)
- Never log or transmit passwords in plaintext
- Enforce strong password policies

```typescript
// Backend: Hash password on registration
import * as bcrypt from 'bcrypt';

async register(email: string, password: string) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return this.userRepository.save({
    email,
    password: hashedPassword,
  });
}

// Verify password on login
async validatePassword(plainPassword: string, hashedPassword: string) {
  return bcrypt.compare(plainPassword, hashedPassword);
}
```

### Dependency Security

- Keep dependencies up to date
- Use `npm audit` to check for vulnerabilities
- Pin exact versions in `package-lock.json`

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies safely
npm update
```

---

## Authentication Guide

### JWT Authentication

Brain-Storm uses JWT (JSON Web Tokens) for stateless authentication.

**Configuration:**

```typescript
// apps/backend/src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
      algorithms: ['HS256'], // Only accept HS256
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email };
  }
}
```

**Best Practices:**

- Use strong `JWT_SECRET` (minimum 64 random bytes)
- Set short expiry time (15 minutes recommended)
- Implement refresh token rotation
- Always validate the `alg` header (reject `alg: none`)
- Store JWTs in `httpOnly`, `Secure`, `SameSite=Strict` cookies

```typescript
// Frontend: Store JWT securely
// ✅ Good: httpOnly cookie (set by backend)
// ❌ Bad: localStorage
// localStorage.setItem('token', jwt); // Vulnerable to XSS
```

### Stellar Wallet Authentication

For blockchain-based authentication:

```typescript
// Backend: Verify Stellar signature
import { Keypair } from '@stellar/stellar-sdk';

async verifySignature(publicKey: string, message: string, signature: string) {
  const keypair = Keypair.fromPublicKey(publicKey);
  return keypair.verify(Buffer.from(message), Buffer.from(signature, 'base64'));
}

// Frontend: Sign with Stellar wallet
const message = `Sign in to Brain-Storm: ${Date.now()}`;
const signature = await wallet.signMessage(message);
const response = await axios.post('/auth/stellar-login', {
  publicKey: wallet.publicKey,
  message,
  signature,
});
```

### Multi-Factor Authentication (MFA)

Implement TOTP (Time-based One-Time Password) for sensitive operations:

```typescript
// Backend: Generate TOTP secret
import * as speakeasy from 'speakeasy';

async enableMfa(userId: string) {
  const secret = speakeasy.generateSecret({
    name: `Brain-Storm (${userId})`,
    issuer: 'Brain-Storm',
  });
  
  // Store secret securely (encrypted)
  await this.userRepository.update(userId, {
    mfaSecret: encrypt(secret.base32),
  });
  
  return { qrCode: secret.qr_code };
}

// Verify TOTP token
async verifyMfaToken(userId: string, token: string) {
  const user = await this.userRepository.findOne(userId);
  const secret = decrypt(user.mfaSecret);
  
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2,
  });
}
```

---

## Authorization Patterns

### Role-Based Access Control (RBAC)

Define roles and enforce them at every layer:

```typescript
// Backend: Define roles
export enum Role {
  Admin = 'admin',
  Instructor = 'instructor',
  Student = 'student',
}

// Apply role guards
@Get('courses/:id/analytics')
@Roles(Role.Instructor, Role.Admin)
@UseGuards(JwtAuthGuard, RolesGuard)
async getCourseAnalytics(@Param('id') courseId: string) {
  // Only instructors and admins can access
}
```

### Attribute-Based Access Control (ABAC)

For fine-grained permissions:

```typescript
// Backend: Check specific attributes
@Post('courses/:id/publish')
@UseGuards(JwtAuthGuard)
async publishCourse(@Param('id') courseId: string, @Req() req) {
  const course = await this.courseRepository.findOne(courseId);
  
  // Only the course creator or admin can publish
  if (course.creatorId !== req.user.id && req.user.role !== Role.Admin) {
    throw new ForbiddenException('Cannot publish this course');
  }
  
  return this.courseRepository.update(courseId, { published: true });
}
```

### On-Chain Authorization

Enforce authorization in smart contracts:

```rust
// Soroban: Check caller permissions
pub fn transfer_tokens(env: Env, to: Address, amount: i128) -> Result<(), Error> {
    let caller = env.invoker();
    
    // Verify caller has permission
    let has_permission = check_permission(&env, &caller, "transfer")?;
    if !has_permission {
        return Err(Error::Unauthorized);
    }
    
    // Perform transfer
    transfer_internal(&env, &caller, &to, amount)?;
    Ok(())
}
```

---

## Security Checklist

Use this checklist before deploying to production:

### Code Security

- [ ] All user input is validated and sanitized
- [ ] No hardcoded secrets or credentials in code
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding, CSP headers)
- [ ] CSRF protection (CSRF tokens for state changes)
- [ ] Secure password hashing (bcrypt, 10+ rounds)
- [ ] No sensitive data in logs
- [ ] Error messages don't leak system information

### Authentication & Authorization

- [ ] JWT secret is strong (64+ random bytes)
- [ ] JWT expiry is short (15 minutes recommended)
- [ ] Refresh token rotation implemented
- [ ] Role-based access control enforced
- [ ] On-chain authorization verified
- [ ] MFA enabled for admin accounts
- [ ] Session timeout configured

### Data Protection

- [ ] Sensitive data encrypted at rest
- [ ] HTTPS/TLS enforced for all communications
- [ ] Database backups encrypted
- [ ] Secrets stored in secure vault (not in code)
- [ ] PII handled according to GDPR/privacy policy
- [ ] Data retention policies enforced

### Infrastructure

- [ ] Firewall rules restrict access
- [ ] Rate limiting enabled on API endpoints
- [ ] DDoS protection configured
- [ ] Security headers set (CSP, X-Frame-Options, etc.)
- [ ] CORS policy restricted to trusted origins
- [ ] Logging and monitoring enabled
- [ ] Incident response plan documented

### Dependencies

- [ ] `npm audit` shows no critical vulnerabilities
- [ ] Dependencies updated to latest secure versions
- [ ] Dependency licenses reviewed
- [ ] Supply chain security verified

### Testing

- [ ] Security tests included in CI/CD
- [ ] Penetration testing completed
- [ ] OWASP Top 10 vulnerabilities tested
- [ ] Security code review completed

---

## Security Incident Procedures

### 1. Detection & Triage

When a security issue is discovered:

1. **Assess severity:**
   - **Critical:** Active exploitation, data breach, system compromise
   - **High:** Potential for exploitation, significant impact
   - **Medium:** Limited impact, requires specific conditions
   - **Low:** Theoretical risk, minimal impact

2. **Determine scope:**
   - Which systems are affected?
   - How many users are impacted?
   - What data is at risk?

### 2. Immediate Response

**For Critical/High severity:**

1. Create a private security issue (do not disclose publicly)
2. Notify the security team immediately
3. Isolate affected systems if necessary
4. Begin incident investigation
5. Prepare a fix

**For Medium/Low severity:**

1. Create a private issue
2. Schedule fix in next sprint
3. Document in security log

### 3. Investigation

1. Determine root cause
2. Identify all affected systems and data
3. Check logs for exploitation evidence
4. Assess impact on users

### 4. Remediation

1. Develop and test fix
2. Deploy fix to production
3. Verify fix effectiveness
4. Monitor for re-occurrence

### 5. Disclosure

**For public vulnerabilities:**

1. Prepare security advisory
2. Notify affected users
3. Provide remediation steps
4. Publish advisory (after fix is deployed)

**Timeline:**
- Critical: Disclose within 24 hours of fix
- High: Disclose within 7 days of fix
- Medium/Low: Disclose in next release notes

### 6. Post-Incident

1. Document incident in security log
2. Conduct post-mortem
3. Implement preventive measures
4. Update security policies if needed
5. Share learnings with team

### Reporting Security Issues

**Do not open public issues for security vulnerabilities.**

Instead, email: `security@brainstorm.dev` with:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

We will acknowledge receipt within 24 hours and keep you updated on progress.

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [NestJS Security](https://docs.nestjs.com/security/authentication)
- [Stellar Security](https://developers.stellar.org/docs/learn/security)
- [Soroban Security](https://soroban.stellar.org/docs/learn/security)

---

**Last Updated:** 2026-05-29  
**Maintained By:** Security Team
