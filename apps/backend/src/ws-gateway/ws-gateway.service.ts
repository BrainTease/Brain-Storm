import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class WsGatewayService {
  constructor(@Inject('REDIS_PUBLISHER') private redis: Redis) {}

  async publish(userId: string | null, event: string, data: unknown): Promise<void> {
    await this.redis.publish('ws-events', JSON.stringify({ userId, event, data }));
  }
}
