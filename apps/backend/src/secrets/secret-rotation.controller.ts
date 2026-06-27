import { Controller, Post, Get, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SecretRotationService } from './secret-rotation.service';
import { AwsSecretsService } from './aws-secrets.service';

@ApiTags('secret-rotation')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('secrets')
export class SecretRotationController {
  constructor(
    private readonly rotationService: SecretRotationService,
    private readonly awsSecretsService: AwsSecretsService,
  ) {}

  @Post('api-keys/:id/rotate')
  @ApiOperation({ summary: 'Rotate an API key' })
  rotateApiKey(@Request() req: any, @Param('id') id: string) {
    return this.rotationService.rotateApiKey(id, req.user.userId).then((apiKey) => ({ apiKey }));
  }

  @Get('rotation-history')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get secret rotation history (admin only)' })
  @ApiQuery({ name: 'secretType', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getHistory(@Query('secretType') secretType?: string, @Query('limit') limit?: string) {
    return this.rotationService.getRotationHistory(secretType, limit ? parseInt(limit, 10) : 50);
  }

  @Get('access-logs')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get secret access logs (admin only)' })
  @ApiQuery({ name: 'secretName', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getAccessLogs(@Query('secretName') secretName?: string, @Query('limit') limit?: string) {
    return this.awsSecretsService.getAccessLogs(secretName, limit ? parseInt(limit, 10) : 100);
  }

  @Get('aws/list')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List secrets in AWS Secrets Manager (admin only)' })
  listAwsSecrets() {
    return this.awsSecretsService.listSecrets();
  }

  @Get('aws/:name/describe')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Describe a secret in AWS Secrets Manager (admin only)' })
  describeAwsSecret(@Param('name') name: string) {
    return this.awsSecretsService.describeSecret(name);
  }

  @Post('aws/:name/backup')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Backup a secret from AWS Secrets Manager (admin only)' })
  backupSecret(@Request() req: any, @Param('name') name: string) {
    return this.awsSecretsService.backupSecret(name, req.user.userId);
  }

  @Post('aws/:name/emergency-access')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Emergency (break-glass) access to a secret (admin only)' })
  @ApiBody({ schema: { properties: { reason: { type: 'string' } }, required: ['reason'] } })
  emergencyAccess(
    @Request() req: any,
    @Param('name') name: string,
    @Body('reason') reason: string,
  ) {
    const ip = req.ip as string;
    return this.awsSecretsService
      .emergencyAccess(name, req.user.userId, reason, ip)
      .then((value) => ({ secretName: name, value }));
  }
}
