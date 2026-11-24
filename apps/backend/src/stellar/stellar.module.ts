import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerModule } from '../common/logger/logger.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

import { AnalyticsEventHandler } from './event-handlers/analytics-event.handler';
import { ContractEventDispatcher } from './event-handlers/contract-event.dispatcher';
import { TokenEventHandler } from './event-handlers/token-event.handler';
import { NetworkMonitorService } from './network-monitor.service';
import { SorobanRpcClientService } from './soroban-rpc-client.service';
import { StellarClientFactory } from './stellar-client.factory';
import { StellarIndexerService } from './stellar-indexer.service';
import { StellarSdkService } from './stellar-sdk.service';
import { StellarTransactionLog } from './stellar-transaction-log.entity';
import { StellarController, CredentialsController } from './stellar.controller';
import { StellarService } from './stellar.service';
import { TransactionBuilderService } from './transaction-builder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StellarTransactionLog]),
    forwardRef(() => CredentialsModule),
    NotificationsModule,
    forwardRef(() => UsersModule),
    LoggerModule,
  ],
  providers: [
    StellarClientFactory,
    StellarSdkService,
    SorobanRpcClientService,
    TransactionBuilderService,
    StellarService,
    NetworkMonitorService,
    ContractEventDispatcher,
    AnalyticsEventHandler,
    TokenEventHandler,
    {
      provide: StellarIndexerService,
      useFactory: (
        configService: any,
        cacheManager: any,
        dispatcher: ContractEventDispatcher,
        analyticsHandler: AnalyticsEventHandler,
        tokenHandler: TokenEventHandler,
        sdk: StellarSdkService
      ) => {
        dispatcher.register(analyticsHandler);
        dispatcher.register(tokenHandler);
        return new StellarIndexerService(configService, cacheManager, dispatcher, sdk);
      },
      inject: ['ConfigService', 'CACHE_MANAGER', ContractEventDispatcher, AnalyticsEventHandler, TokenEventHandler, StellarSdkService],
    },
  ],
  controllers: [StellarController, CredentialsController],
  exports: [StellarClientFactory, StellarService, SorobanRpcClientService, NetworkMonitorService, TransactionBuilderService],
})
export class StellarModule {}
