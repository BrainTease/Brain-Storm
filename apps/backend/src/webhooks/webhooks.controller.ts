import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
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

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/webhooks')
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Post()
  @ApiOperation({ summary: 'Register a webhook' })
  create(@Request() req: any, @Body() dto: CreateWebhookDto) {
    return this.service.register(req.user.userId, dto.url, dto.events);
  }

  @Get()
  @ApiOperation({ summary: 'List webhooks' })
  list(@Request() req: any) {
    return this.service.list(req.user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a webhook' })
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.service.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a webhook' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.service.delete(req.user.userId, id);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get delivery logs for a webhook' })
  logs(@Request() req: any, @Param('id') id: string) {
    return this.service.getLogs(id, req.user.userId);
  }
}
