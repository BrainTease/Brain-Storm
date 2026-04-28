import { Controller, Post, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SecretRotationService } from './secret-rotation.service';

@ApiTags('secret-rotation')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('secrets')
export class SecretRotationController {
  constructor(private readonly rotationService: SecretRotationService) {}

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
}
