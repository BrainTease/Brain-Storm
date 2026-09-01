import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StellarService } from './stellar.service';
import { StellarController, CredentialsController } from './stellar.controller';
import { NetworkMonitorService } from './network-monitor.service';
import { StellarIndexerService } from './stellar-indexer.service';
import { StellarTransactionLog } from './stellar-transaction-log.entity';
import { SorobanRpcClientService } from './soroban-rpc-client.service';
import { StellarClientFactory } from './stellar-client.factory';
import { TransactionBuilderService } from './transaction-builder.service';
import { ContractEventDispatcher } from './event-handlers/contract-event.dispatcher';
import { AnalyticsEventHandler } from './event-handlers/analytics-event.handler';
import { TokenEventHandler } from './event-handlers/token-event.handler';
import { CredentialsModule } from '../credentials/credentials.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { LoggerModule } from '../common/logger/logger.module';

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
        tokenHandler: TokenEventHandler
      ) => {
        dispatcher.register(analyticsHandler);
        dispatcher.register(tokenHandler);
        return new StellarIndexerService(configService, cacheManager, dispatcher);
      },
      inject: ['ConfigService', 'CACHE_MANAGER', ContractEventDispatcher, AnalyticsEventHandler, TokenEventHandler],
    },
  ],
  controllers: [StellarController, CredentialsController],
  exports: [StellarClientFactory, StellarService, SorobanRpcClientService, NetworkMonitorService, TransactionBuilderService],
})
export class StellarModule {}
