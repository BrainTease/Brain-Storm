import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { WsGatewayGateway } from './ws-gateway.gateway';
import { WsGatewayService } from './ws-gateway.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    WsGatewayGateway,
    WsGatewayService,
    {
      provide: 'REDIS_PUBLISHER',
      useFactory: (config: ConfigService) => new Redis(config.get<string>('redis.url')!),
      inject: [ConfigService],
    },
    {
      provide: 'REDIS_SUBSCRIBER',
      useFactory: (config: ConfigService) => new Redis(config.get<string>('redis.url')!),
      inject: [ConfigService],
    },
  ],
  exports: [WsGatewayGateway, WsGatewayService],
})
export class WsGatewayModule {}
