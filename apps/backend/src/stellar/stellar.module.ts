import { Module } from '@nestjs/common';
import { StellarService } from './stellar.service';
import { StellarController, CredentialsController } from './stellar.controller';
import { NetworkMonitorService } from './network-monitor.service';

@Module({
  providers: [StellarService, NetworkMonitorService],
  controllers: [StellarController, CredentialsController],
  exports: [StellarService, NetworkMonitorService],
})
export class StellarModule {}
