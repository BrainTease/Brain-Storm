import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsUrl, IsArray, IsString, IsBoolean, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WebhooksService } from './webhooks.service';

class CreateWebhookDto {
  @IsUrl() url: string;
  @IsArray() @IsString({ each: true }) events: string[];
}

class UpdateWebhookDto {
  @IsOptional() @IsUrl() url?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) events?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class VerifySignatureDto {
  @IsString() webhookId: string;
  @IsString() body: string;
  @IsString() signature: string;
  @IsOptional() @IsString() timestamp?: string;
}

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/webhooks')
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Post()
  @ApiOperation({ summary: 'Register a webhook endpoint' })
  create(@Request() req: any, @Body() dto: CreateWebhookDto) {
    return this.service.register(req.user.userId, dto.url, dto.events);
  }

  @Get()
  @ApiOperation({ summary: 'List all webhooks for the authenticated user' })
  list(@Request() req: any) {
    return this.service.list(req.user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a webhook (url, events, isActive)' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.service.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.service.delete(req.user.userId, id);
  }

  @Post(':id/rotate-secret')
  @ApiOperation({ summary: 'Rotate the HMAC signing secret (old secret valid for 24 h)' })
  rotateSecret(@Request() req: any, @Param('id') id: string) {
    return this.service.rotateSecret(req.user.userId, id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get delivery logs for a webhook (most recent 100)' })
  logs(@Request() req: any, @Param('id') id: string) {
    return this.service.getLogs(id, req.user.userId);
  }

  @Get(':id/dlq')
  @ApiOperation({ summary: 'Get dead-letter (failed after all retries) deliveries' })
  dlq(@Request() req: any, @Param('id') id: string) {
    return this.service.getDlq(id, req.user.userId);
  }

  @Post('deliveries/:deliveryId/replay')
  @ApiOperation({ summary: 'Replay a failed/DLQ delivery' })
  replayDelivery(@Request() req: any, @Param('deliveryId') deliveryId: string) {
    return this.service.replayDelivery(deliveryId, req.user.userId);
  }

  @Post('verify-signature')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a webhook HMAC signature (supports old secret during rotation grace period)' })
  async verifySignature(@Request() req: any, @Body() dto: VerifySignatureDto) {
    const webhook = await this.service.getWebhookForUser(dto.webhookId, req.user.userId);
    const valid = this.service.verifySignature(
      webhook.secret,
      dto.body,
      dto.signature,
      dto.timestamp,
      webhook.previousSecret,
      webhook.secretRotatedAt,
    );
    if (!valid) throw new UnauthorizedException('Invalid signature or timestamp');
    return { valid: true };
  }
}
