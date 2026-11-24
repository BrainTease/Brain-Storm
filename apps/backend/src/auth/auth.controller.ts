import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';

import { THROTTLE } from '../rate-limit/rate-limit.config';

import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GenerateApiKeyDto } from './dto/generate-api-key.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { MfaCodeDto } from './dto/mfa-code.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RevokeApiKeyDto } from './dto/revoke-api-key.dto';
import { StellarChallengeDto } from './dto/stellar-challenge.dto';
import { StellarVerifyDto } from './dto/stellar-verify.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { StellarAuthService } from './stellar-auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private stellarAuthService: StellarAuthService
  ) {}

  @Get('stellar')
  @ApiOperation({ summary: 'SEP-0010: get challenge transaction' })
  @ApiResponse({
    status: 200,
    description: 'Returns unsigned challenge XDR and network passphrase',
  })
  stellarChallenge(@Query('account') account: string) {
    return this.stellarAuthService.buildChallenge(account);
  }

  @Post('stellar')
  @Throttle(THROTTLE.perMinute10)
  @ApiOperation({ summary: 'SEP-0010: verify signed challenge and receive JWT' })
  @ApiResponse({ status: 201, description: 'Returns access_token' })
  @ApiResponse({ status: 401, description: 'Invalid or expired challenge' })
  stellarVerify(@Body('transaction') transaction: string) {
    return this.stellarAuthService.verifyChallenge(transaction);
  }

  @Post('register')
  @Throttle(THROTTLE.perMinute5)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ schema: { example: { email: 'user@example.com', password: 'password123' } } })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: { example: { access_token: 'jwt', refresh_token: 'token' } },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  register(@Body() dto: AuthDto, @Query('ref') ref?: string) {
    return this.authService.register(dto.email, dto.password, ref);
  }

  @Post('login')
  @Throttle(THROTTLE.perMinute5)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ schema: { example: { email: 'user@example.com', password: 'password123' } } })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: { example: { access_token: 'jwt', refresh_token: 'token' } },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password, dto.mfa_token);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ schema: { example: { refresh_token: 'token' } } })
  @ApiResponse({
    status: 200,
    description: 'New access token issued',
    schema: { example: { access_token: 'jwt' } },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiBody({ schema: { example: { refresh_token: 'token', access_token: 'jwt' } } })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refresh_token, undefined, dto.access_token);
  }

  @Get('verify')
  @ApiOperation({ summary: 'Verify email address via token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiBody({ schema: { example: { email: 'user@example.com' } } })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 404, description: 'User not found' })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Throttle(THROTTLE.perHour3)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiBody({ schema: { example: { email: 'user@example.com' } } })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  @ApiResponse({ status: 404, description: 'User not found' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiBody({ schema: { example: { token: 'reset-token', newPassword: 'newpassword123' } } })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('mfa/enable')
  @UseGuards(JwtAuthGuard)
  enableMfa(@Req() req: Request) {
    return this.authService.generateMfaSecret(req.user!.id);
  }

  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  verifyMfa(@Req() req: Request, @Body() dto: MfaCodeDto) {
    return this.authService.verifyMfaSecret(req.user!.id, dto.code);
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  disableMfa(@Req() req: Request, @Body() dto: MfaCodeDto) {
    return this.authService.disableMfa(req.user!.id, dto.code);
  }

  @Post('mfa/backup-codes/regenerate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Regenerate backup codes (requires valid TOTP)' })
  regenerateBackupCodes(@Req() req: Request, @Body() dto: MfaCodeDto) {
    return this.authService.regenerateBackupCodes(req.user!.id, dto.code);
  }

  @Post('admin/api-keys')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  generateApiKey(@Body() dto: GenerateApiKeyDto) {
    return this.authService.generateApiKey(dto.userId, dto.name);
  }

  @Post('admin/api-keys/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  revokeApiKey(@Body() dto: RevokeApiKeyDto) {
    return this.authService.revokeApiKey(dto.id);
  }

  @Post('stellar-challenge')
  @UseGuards(JwtAuthGuard)
  @Throttle(THROTTLE.perMinute10)
  @ApiOperation({ summary: 'Generate a challenge for Stellar wallet signing' })
  @ApiResponse({ status: 200, description: 'Challenge generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  generateStellarChallenge(@Body() dto: StellarChallengeDto) {
    return this.authService.generateStellarChallenge(dto.publicKey);
  }

  @Post('stellar-verify')
  @UseGuards(JwtAuthGuard)
  @Throttle(THROTTLE.perMinute10)
  @ApiOperation({ summary: 'Verify Stellar wallet signature and link to account' })
  @ApiResponse({ status: 200, description: 'Wallet linked successfully' })
  @ApiResponse({ status: 400, description: 'Invalid signature or challenge' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  verifyStellarSignature(@Req() req: Request, @Body() dto: StellarVerifyDto) {
    return this.authService.verifyStellarSignature(
      req.user!.id,
      dto.publicKey,
      dto.signature,
      dto.challenge
    );
  }
}
