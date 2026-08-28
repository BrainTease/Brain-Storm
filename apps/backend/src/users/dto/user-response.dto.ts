/**
 * UserResponseDto — issue #993
 *
 * The only shape that leaves the API for any user-related response.
 * Every field that is internal-only or security-sensitive is omitted:
 *
 *   Stripped fields (never sent to clients):
 *   - passwordHash       — bcrypt/argon2 hash; must never be exposed
 *   - mfaSecret          — TOTP seed; exposure allows account takeover
 *   - mfaBackupCodes     — recovery codes; exposure allows account takeover
 *   - verificationToken  — email-verification hash
 *   - verificationTokenExpiresAt — paired expiry
 *   - createdBy / updatedBy — internal audit columns
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../user.entity';

export class UserResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiPropertyOptional({ example: 'stellar_dev' })
  username: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatars/user.png' })
  avatar: string | null;

  @ApiPropertyOptional({ example: 'Blockchain enthusiast.' })
  bio: string | null;

  @ApiPropertyOptional({ example: 'GABCDE...' })
  stellarPublicKey: string | null;

  @ApiProperty({ example: 'student', enum: ['student', 'instructor', 'admin'] })
  role: string;

  @ApiProperty({ example: false })
  isBanned: boolean;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiProperty({ example: false })
  mfaEnabled: boolean;

  @ApiPropertyOptional({ example: 'REF123' })
  referralCode: string | null;

  @ApiPropertyOptional({ example: 'REF456' })
  referredBy: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  constructor(user: User) {
    this.id = user.id;
    this.email = user.email;
    this.username = user.username ?? null;
    this.avatar = user.avatar ?? null;
    this.bio = user.bio ?? null;
    this.stellarPublicKey = user.stellarPublicKey ?? null;
    this.role = user.role;
    this.isBanned = user.isBanned;
    this.isVerified = user.isVerified;
    this.mfaEnabled = user.mfaEnabled;
    this.referralCode = user.referralCode ?? null;
    this.referredBy = user.referredBy ?? null;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
    // Intentionally omitted: passwordHash, mfaSecret, mfaBackupCodes,
    // verificationToken, verificationTokenExpiresAt, createdBy, updatedBy
  }
}

/** Serialise a single User entity into a safe response DTO. */
export function toUserResponseDto(user: User): UserResponseDto {
  return new UserResponseDto(user);
}

/** Serialise an array of User entities into safe response DTOs. */
export function toUserResponseDtos(users: User[]): UserResponseDto[] {
  return users.map(toUserResponseDto);
}
