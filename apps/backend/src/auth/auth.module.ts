import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditModule } from '../audit/audit.module';
import { EncryptionService } from '../common/encryption.service';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';

import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { ApiKey } from './api-key.entity';
import { ApiKeyStrategy } from './api-key.strategy';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { PasswordResetToken } from './password-reset-token.entity';
import { RefreshToken } from './refresh-token.entity';
import { RolesGuard } from './roles.guard';
import { StellarAuthService } from './stellar-auth.service';
import { TokenBlacklist } from './token-blacklist.entity';
import { TokenBlacklistService } from './token-blacklist.service';

@Module({
  imports: [
    UsersModule,
    MailModule,
    PassportModule,
    AuditModule,
    TypeOrmModule.forFeature([PasswordResetToken, RefreshToken, ApiKey, TokenBlacklist]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  providers: [
    AuthRepository,
    AuthService,
    StellarAuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    EncryptionService,
    ApiKeyStrategy,
    ApiKeyAuthGuard,
    TokenBlacklistService,
  ],
  controllers: [AuthController],
  exports: [JwtAuthGuard, RolesGuard, ApiKeyAuthGuard, TokenBlacklistService, AuthRepository],
})
export class AuthModule {}
