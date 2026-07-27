import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { GracefulShutdownService } from './graceful-shutdown.service';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
  providers: [GracefulShutdownService],
  exports: [GracefulShutdownService],
})
export class HealthModule {}
