import { Body, Controller, Get, Post, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './google-auth.guard';
import { GoogleProfile } from './google.strategy';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

class AuthDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

class LoginDto extends AuthDto {
  @IsString()
  @IsOptional()
  mfa_token?: string;
}

class ResendVerificationDto {
  @IsEmail() email: string;
}

class ForgotPasswordDto {
  @IsEmail() email: string;
}

class ResetPasswordDto {
  @IsString() token: string;
  @IsString() @MinLength(8) newPassword: string;
}

class RefreshDto {
  @IsString() refresh_token: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully', schema: { example: { data: { access_token: 'jwt_token' }, statusCode: 201, timestamp: '2024-01-01T00:00:00.000Z' } } })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  register(@Body() dto: AuthDto) {
    return this.authService.register(dto.email, dto.password);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful', schema: { example: { data: { access_token: 'jwt_token' }, statusCode: 200, timestamp: '2024-01-01T00:00:00.000Z' } } })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password, dto.mfa_token);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refresh_token);
  }

  @Get('verify')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('mfa/enable')
  @UseGuards(JwtAuthGuard)
  enableMfa(@Request() req) {
    return this.authService.generateMfaSecret(req.user.id);
  }

  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  verifyMfa(@Request() req, @Body('code') code: string) {
    return this.authService.verifyMfaSecret(req.user.id, code);
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  disableMfa(@Request() req, @Body('code') code: string) {
    return this.authService.disableMfa(req.user.id, code);
  }

  @Post('admin/api-keys')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  generateApiKey(@Body('userId') userId: string, @Body('name') name: string) {
    return this.authService.generateApiKey(userId, name);
  }

  @Post('admin/api-keys/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  revokeApiKey(@Body('id') id: string) {
    return this.authService.revokeApiKey(id);
  }

  @Post('stellar-challenge')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Generate a challenge for Stellar wallet signing' })
  @ApiResponse({ status: 200, description: 'Challenge generated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  generateStellarChallenge(@Body('publicKey') publicKey: string) {
    return this.authService.generateStellarChallenge(publicKey);
  }

  @Post('stellar-verify')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify Stellar wallet signature and link to account' })
  @ApiResponse({ status: 200, description: 'Wallet linked successfully' })
  @ApiResponse({ status: 400, description: 'Invalid signature or challenge' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  verifyStellarSignature(
    @Request() req,
    @Body('publicKey') publicKey: string,
    @Body('signature') signature: string,
    @Body('challenge') challenge: string,
  ) {
    return this.authService.verifyStellarSignature(req.user.id, publicKey, signature, challenge);
  }
}
