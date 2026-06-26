import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Inject, Logger, OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/ws' })
export class WsGatewayGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(WsGatewayGateway.name);

  constructor(
    private jwtService: JwtService,
    @Inject('REDIS_PUBLISHER') private redisPublisher: Redis,
    @Inject('REDIS_SUBSCRIBER') private redisSubscriber: Redis,
  ) {}

  onModuleInit() {
    void this.redisSubscriber.subscribe('ws-events');
    this.redisSubscriber.on('message', (_channel: string, message: string) => {
      const { userId, event, data } = JSON.parse(message) as {
        userId?: string;
        event: string;
        data: unknown;
      };
      if (userId) {
        this.emitToUser(userId, event, data);
      } else {
        this.broadcastToAll(event, data);
      }
    });
  }

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = this.jwtService.verify<{ sub: string }>(token);
      void client.join(`user:${payload.sub}`);
      this.logger.log(`Client connected: ${client.id}, user: ${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing() {
    return { event: 'pong', data: Date.now() };
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  broadcastToAll(event: string, data: unknown) {
    this.server.emit(event, data);
  }
}
