import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { GatewayService } from './gateway.service';

@ApiTags('api-gateway')
@Controller('v1/gateway')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Get('health')
  @ApiOperation({ summary: 'API gateway health check' })
  health() {
    return this.gatewayService.getHealthSummary();
  }

  @Get('routes')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List all registered API gateway routes (admin only)' })
  routes() {
    return { routes: this.gatewayService.getRoutes() };
  }
}
