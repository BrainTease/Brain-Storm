# Security Best Practices Guide

Comprehensive security guidelines for developers working on Brain-Storm.

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

### 1. Defense in Depth

Implement multiple layers of security:
- Frontend validation (UX)
- API validation (security)
- Database constraints (data integrity)
- Blockchain verification (immutability)

### 2. Principle of Least Privilege

Grant minimum necessary permissions:
- Users get only required roles
- Services get only required API keys
- Databases get only required access

### 3. Fail Securely

When security checks fail:
- Deny access by default
- Log security events
- Alert on suspicious activity
- Never expose sensitive information in errors

### 4. Input Validation

Treat all external input as untrusted:
- Validate type, length, format
- Reject invalid input
- Sanitize before storage
- Use parameterized queries

### 5. Secure by Default

- Enable security features by default
- Require explicit opt-out for less secure options
- Use secure defaults in configuration
- Document security implications

---

## Secure Coding Practices

### Input Validation

**Always validate user input:**

```typescript
// ❌ Bad: No validation
@Post('courses')
createCourse(@Body() data: any) {
  return this.courseService.create(data);
}

// ✅ Good: Validate with DTO
@Post('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
createCourse(@Body() dto: CreateCourseDto) {
  return this.courseService.create(dto);
}

// DTO with validation
export class CreateCourseDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsString()
  @MaxLength(1000)
  description: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  price: number;
}
```

### SQL Injection Prevention

**Use parameterized queries:**

```typescript
// ❌ Bad: SQL injection vulnerability
const user = await db.query(
  `SELECT * FROM users WHERE email = '${email}'`
);

// ✅ Good: Parameterized query
const user = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// ✅ Good: TypeORM (ORM handles parameterization)
const user = await this.userRepository.findOne({
  where: { email },
});
```

### Cross-Site Scripting (XSS) Prevention

**Sanitize output:**

```typescript
// ❌ Bad: Renders unsanitized HTML
<div [innerHTML]="userComment"></div>

// ✅ Good: Text content (auto-escaped)
<div>{{ userComment }}</div>

// ✅ Good: Sanitize if HTML needed
import { DomSanitizer } from '@angular/platform-browser';

constructor(private sanitizer: DomSanitizer) {}

getSafeHtml(html: string) {
  return this.sanitizer.sanitize(SecurityContext.HTML, html);
}
```

### Cross-Site Request Forgery (CSRF) Prevention

**Use CSRF tokens:**

```typescript
// Backend: Generate CSRF token
@Get('csrf-token')
getCsrfToken(@Req() req: Request) {
  const token = generateCsrfToken();
  req.session.csrfToken = token;
  return { token };
}

// Frontend: Include in requests
const token = await fetch('/csrf-token').then(r => r.json());
fetch('/api/courses', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': token.token,
  },
  body: JSON.stringify(data),
});
```

### Sensitive Data Handling

**Never log sensitive data:**

```typescript
// ❌ Bad: Logs password
logger.info(`User login: ${email}, ${password}`);

// ✅ Good: Only log necessary info
logger.info(`User login attempt: ${email}`);

// ✅ Good: Mask sensitive data
const maskedKey = key.substring(0, 4) + '****' + key.substring(-4);
logger.info(`API key used: ${maskedKey}`);
```

### Error Handling

**Don't expose sensitive information:**

```typescript
// ❌ Bad: Exposes database details
catch (error) {
  res.status(500).json({
    message: error.message,
    query: error.query,
    stack: error.stack,
  });
}

// ✅ Good: Generic error message
catch (error) {
  logger.error('Database error', error);
  res.status(500).json({
    message: 'An error occurred. Please try again.',
  });
}
```

---

## Authentication Guide

### JWT Best Practices

**Secure token generation:**

```typescript
// Backend: Generate JWT
const token = this.jwtService.sign(
  { sub: user.id, email: user.email },
  {
    secret: process.env.JWT_SECRET,
    expiresIn: '15m',
    algorithm: 'HS256',
  }
);

// Frontend: Store in httpOnly cookie
res.cookie('token', token, {
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000, // 15 minutes
});
```

**Validate JWT:**

```typescript
// Validate algorithm
const decoded = jwt.verify(token, secret, {
  algorithms: ['HS256'], // Reject 'none' algorithm
});

// Reject if 'alg: none'
if (decoded.header.alg === 'none') {
  throw new Error('Invalid token algorithm');
}
```

### Multi-Factor Authentication (MFA)

**Implement MFA:**

```typescript
// Enable MFA for sensitive operations
@Post('auth/mfa/setup')
@UseGuards(JwtAuthGuard)
setupMfa(@Req() req: Request) {
  const secret = speakeasy.generateSecret({
    name: `Brain-Storm (${req.user.email})`,
  });
  return { qrCode: secret.qr_code };
}

// Verify MFA token
@Post('auth/mfa/verify')
verifyMfa(@Body() dto: VerifyMfaDto) {
  const isValid = speakeasy.totp.verify({
    secret: dto.secret,
    encoding: 'base32',
    token: dto.token,
  });
  if (!isValid) throw new UnauthorizedException();
}
```

### Stellar Authentication

**Verify Stellar signatures:**

```typescript
// Frontend: Sign with Stellar wallet
const transaction = new TransactionBuilder(account, {
  fee: BASE_FEE,
  networkPassphrase: Networks.TESTNET_NETWORK_PASSPHRASE,
})
  .addMemo(Memo.text('login'))
  .setTimeout(300)
  .build();

const signed = await wallet.signTransaction(transaction);

// Backend: Verify signature
const verified = StrKey.isValidEd25519PublicKey(publicKey) &&
  transaction.verify(publicKey);

if (!verified) throw new UnauthorizedException();
```

---

## Authorization Patterns

### Role-Based Access Control (RBAC)

**Enforce roles at API layer:**

```typescript
// Define roles
enum Role {
  Admin = 'admin',
  Instructor = 'instructor',
  Student = 'student',
}

// Apply role guard
@Get('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
getUsers() {
  return this.userService.findAll();
}

// Implement RolesGuard
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}
```

### Resource-Based Access Control

**Check ownership before operations:**

```typescript
@Patch('courses/:id')
@UseGuards(JwtAuthGuard)
updateCourse(
  @Param('id') courseId: string,
  @Req() req: Request,
  @Body() dto: UpdateCourseDto,
) {
  const course = await this.courseService.findById(courseId);
  
  // Verify ownership
  if (course.instructorId !== req.user.id) {
    throw new ForbiddenException('Not authorized');
  }
  
  return this.courseService.update(courseId, dto);
}
```

### On-Chain Authorization

**Verify roles on blockchain:**

```typescript
// Verify instructor role on Soroban
const isInstructor = await this.sorobanService.call(
  'shared',
  'has_role',
  {
    user: req.user.stellarPublicKey,
    role: 'instructor',
  }
);

if (!isInstructor) {
  throw new ForbiddenException('Not an instructor');
}
```

---

## Security Checklist

### Development

- [ ] No hardcoded secrets in code
- [ ] All inputs validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output sanitization)
- [ ] CSRF protection enabled
- [ ] Error messages don't expose sensitive info
- [ ] Sensitive data not logged
- [ ] Dependencies up-to-date
- [ ] No known vulnerabilities: `npm audit`

### API Security

- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input size limits enforced
- [ ] Authentication required for protected routes
- [ ] Authorization checked for all operations
- [ ] API versioning implemented
- [ ] Deprecated endpoints removed

### Database Security

- [ ] Least privilege database user
- [ ] Encrypted connections (SSL/TLS)
- [ ] Backups encrypted
- [ ] Sensitive data encrypted at rest
- [ ] Access logs enabled
- [ ] Regular backups tested
- [ ] No default credentials

### Infrastructure Security

- [ ] Firewall rules configured
- [ ] SSH key-based authentication only
- [ ] Secrets in secure vault (not env files)
- [ ] Monitoring and alerting enabled
- [ ] Incident response plan documented
- [ ] Regular security audits scheduled
- [ ] Penetration testing completed

### Deployment Security

- [ ] Secrets not in Docker images
- [ ] Container images scanned for vulnerabilities
- [ ] Kubernetes RBAC configured
- [ ] Network policies enforced
- [ ] Pod security policies enabled
- [ ] Audit logging enabled

---

## Security Incident Procedures

### Incident Classification

| Severity | Impact | Response Time |
|----------|--------|----------------|
| P0 | Data breach, service down | Immediate |
| P1 | Partial outage, data at risk | 1 hour |
| P2 | Minor issue, no data impact | 4 hours |
| P3 | Low priority, informational | 24 hours |

### Incident Response Steps

**1. Detect & Alert**
```bash
# Automated alerts trigger on:
# - Unusual error rates
# - Failed authentication attempts
# - Unauthorized API calls
# - Database anomalies
```

**2. Assess & Classify**
```
- Determine severity level
- Identify affected systems
- Estimate impact
- Notify incident commander
```

**3. Contain & Mitigate**
```bash
# Immediate actions:
# - Isolate affected systems
# - Revoke compromised credentials
# - Block malicious IPs
# - Disable affected features
```

**4. Investigate & Remediate**
```bash
# Investigation:
# - Review logs and audit trails
# - Identify root cause
# - Determine scope of compromise
# - Collect evidence

# Remediation:
# - Apply security patches
# - Update configurations
# - Rotate credentials
# - Deploy fixes
```

**5. Communicate & Document**
```
- Notify affected users
- Update status page
- Document incident timeline
- Schedule post-mortem
```

**6. Post-Incident Review**
```
- Root cause analysis
- Preventive measures
- Process improvements
- Team training
```

### Incident Report Template

```markdown
## Security Incident Report

**Date:** 2024-05-29
**Severity:** P1
**Status:** Resolved

### Summary
[Brief description of incident]

### Timeline
- 14:30 - Incident detected
- 14:35 - Investigation started
- 14:45 - Root cause identified
- 15:00 - Fix deployed
- 15:15 - Verified resolved

### Impact
- Users affected: [number]
- Data exposed: [yes/no]
- Systems down: [list]

### Root Cause
[Technical explanation]

### Resolution
[What was done]

### Prevention
[How we'll prevent this]

### Follow-up
- [ ] Security audit scheduled
- [ ] Monitoring improved
- [ ] Documentation updated
- [ ] Team training completed
```

### Security Contacts

| Role | Name | Contact |
|------|------|---------|
| Security Lead | Alice | alice@brainstorm.dev |
| DevOps Lead | Bob | bob@brainstorm.dev |
| On-Call | [Rotation] | oncall@brainstorm.dev |

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Stellar Security](https://developers.stellar.org/docs/learn/security)
- [NestJS Security](https://docs.nestjs.com/security/authentication)

---

## Questions?

- Open a security issue (private)
- Email: security@brainstorm.dev
- Ask in #security channel on Discord
