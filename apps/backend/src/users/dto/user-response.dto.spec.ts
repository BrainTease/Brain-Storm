/**
 * Unit tests for UserResponseDto — issue #993
 *
 * Asserts that every internal-only and security-sensitive field on the User
 * entity is stripped before a response reaches the client.
 */
import { UserResponseDto, toUserResponseDto, toUserResponseDtos } from './user-response.dto';
import { User } from '../user.entity';

/** Build a fully-populated User entity including all sensitive fields. */
function buildUser(overrides: Partial<User> = {}): User {
  const user = new User();
  user.id = 'user-uuid-1';
  user.email = 'test@example.com';
  user.username = 'test_user';
  // Sensitive — must never appear in responses
  user.passwordHash = '$argon2id$v=19$m=65536,t=3,p=4$secrethash';
  user.mfaSecret = 'JBSWY3DPEHPK3PXP';
  user.mfaBackupCodes = ['code-1', 'code-2'];
  user.verificationToken = 'sha256-of-token';
  user.verificationTokenExpiresAt = new Date('2024-06-01T00:00:00Z');
  user.createdBy = 'admin-uuid';
  user.updatedBy = 'admin-uuid';
  // Safe public fields
  user.avatar = 'https://cdn.example.com/avatars/user.png';
  user.bio = 'Blockchain enthusiast.';
  user.stellarPublicKey = 'GABCDEABCDE12345';
  user.role = 'student';
  user.isBanned = false;
  user.isVerified = true;
  user.mfaEnabled = false;
  user.referralCode = 'REF123';
  user.referredBy = 'REF456';
  user.createdAt = new Date('2024-01-01T00:00:00Z');
  user.updatedAt = new Date('2024-01-02T00:00:00Z');
  return Object.assign(user, overrides);
}

describe('UserResponseDto', () => {
  // ── Field-stripping (primary acceptance criteria for #993) ─────────────────

  it('strips passwordHash from the response', () => {
    const dto = toUserResponseDto(buildUser());
    expect((dto as any).passwordHash).toBeUndefined();
  });

  it('strips mfaSecret from the response', () => {
    const dto = toUserResponseDto(buildUser());
    expect((dto as any).mfaSecret).toBeUndefined();
  });

  it('strips mfaBackupCodes from the response', () => {
    const dto = toUserResponseDto(buildUser());
    expect((dto as any).mfaBackupCodes).toBeUndefined();
  });

  it('strips verificationToken from the response', () => {
    const dto = toUserResponseDto(buildUser());
    expect((dto as any).verificationToken).toBeUndefined();
  });

  it('strips verificationTokenExpiresAt from the response', () => {
    const dto = toUserResponseDto(buildUser());
    expect((dto as any).verificationTokenExpiresAt).toBeUndefined();
  });

  it('strips createdBy from the response', () => {
    const dto = toUserResponseDto(buildUser());
    expect((dto as any).createdBy).toBeUndefined();
  });

  it('strips updatedBy from the response', () => {
    const dto = toUserResponseDto(buildUser());
    expect((dto as any).updatedBy).toBeUndefined();
  });

  it('strips all sensitive fields in one assertion (no extra own keys)', () => {
    const dto = toUserResponseDto(buildUser());
    const keys = Object.keys(dto);
    const forbidden = [
      'passwordHash',
      'mfaSecret',
      'mfaBackupCodes',
      'verificationToken',
      'verificationTokenExpiresAt',
      'createdBy',
      'updatedBy',
    ];
    for (const field of forbidden) {
      expect(keys).not.toContain(field);
    }
  });

  // ── Public field mapping ───────────────────────────────────────────────────

  it('maps all public fields correctly', () => {
    const user = buildUser();
    const dto = toUserResponseDto(user);

    expect(dto.id).toBe(user.id);
    expect(dto.email).toBe(user.email);
    expect(dto.username).toBe(user.username);
    expect(dto.avatar).toBe(user.avatar);
    expect(dto.bio).toBe(user.bio);
    expect(dto.stellarPublicKey).toBe(user.stellarPublicKey);
    expect(dto.role).toBe(user.role);
    expect(dto.isBanned).toBe(user.isBanned);
    expect(dto.isVerified).toBe(user.isVerified);
    expect(dto.mfaEnabled).toBe(user.mfaEnabled);
    expect(dto.referralCode).toBe(user.referralCode);
    expect(dto.referredBy).toBe(user.referredBy);
    expect(dto.createdAt).toBe(user.createdAt);
    expect(dto.updatedAt).toBe(user.updatedAt);
  });

  it('is an instance of UserResponseDto', () => {
    const dto = toUserResponseDto(buildUser());
    expect(dto).toBeInstanceOf(UserResponseDto);
  });

  // ── Null / optional fields ─────────────────────────────────────────────────

  it('normalises undefined optional fields to null', () => {
    const user = buildUser({
      username: undefined as any,
      avatar: undefined as any,
      bio: undefined as any,
      stellarPublicKey: undefined as any,
      referralCode: undefined as any,
      referredBy: undefined as any,
    });
    const dto = toUserResponseDto(user);

    expect(dto.username).toBeNull();
    expect(dto.avatar).toBeNull();
    expect(dto.bio).toBeNull();
    expect(dto.stellarPublicKey).toBeNull();
    expect(dto.referralCode).toBeNull();
    expect(dto.referredBy).toBeNull();
  });

  // ── toUserResponseDtos (array helper) ─────────────────────────────────────

  it('toUserResponseDtos strips sensitive fields from every element', () => {
    const users = [buildUser({ id: '1' }), buildUser({ id: '2' }), buildUser({ id: '3' })];
    const dtos = toUserResponseDtos(users);

    expect(dtos).toHaveLength(3);
    for (const dto of dtos) {
      expect((dto as any).passwordHash).toBeUndefined();
      expect((dto as any).mfaSecret).toBeUndefined();
      expect((dto as any).mfaBackupCodes).toBeUndefined();
    }
  });

  it('toUserResponseDtos returns an empty array for empty input', () => {
    expect(toUserResponseDtos([])).toEqual([]);
  });

  // ── JSON serialisation ─────────────────────────────────────────────────────

  it('sensitive fields are absent in JSON.stringify output', () => {
    const dto = toUserResponseDto(buildUser());
    const json = JSON.stringify(dto);
    const parsed = JSON.parse(json);

    expect(parsed.passwordHash).toBeUndefined();
    expect(parsed.mfaSecret).toBeUndefined();
    expect(parsed.mfaBackupCodes).toBeUndefined();
    expect(parsed.verificationToken).toBeUndefined();
    expect(parsed.email).toBe('test@example.com');
  });
});
