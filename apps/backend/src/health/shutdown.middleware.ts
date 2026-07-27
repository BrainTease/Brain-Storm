import { Injectable, NestMiddleware, ServiceUnavailableException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { GracefulShutdownService } from './graceful-shutdown.service';

@Injectable()
export class ShutdownMiddleware implements NestMiddleware {
  constructor(private readonly shutdown: GracefulShutdownService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (this.shutdown.shuttingDown) {
      res.setHeader('Connection', 'close');
      throw new ServiceUnavailableException('Server is shutting down');
    }

    this.shutdown.trackRequest();
    res.on('finish', () => this.shutdown.releaseRequest());
    res.on('close', () => this.shutdown.releaseRequest());
    next();
  }
}
