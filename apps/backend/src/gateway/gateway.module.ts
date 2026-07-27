import { Module } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { GatewayController } from './gateway.controller';
import { GatewayLoggingInterceptor } from './gateway.interceptor';
import { GatewayAuthGuard } from './gateway.guard';

@Module({
  providers: [GatewayService, GatewayLoggingInterceptor, GatewayAuthGuard],
  controllers: [GatewayController],
  exports: [GatewayService, GatewayLoggingInterceptor, GatewayAuthGuard],
})
export class GatewayModule {}
