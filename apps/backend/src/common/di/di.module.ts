import { Module, Global } from '@nestjs/common';
import { DIContainer, ServiceLocator } from './di.container';

/**
 * Dependency Injection Module
 * Provides centralized DI container and service locator
 */
@Global()
@Module({
  providers: [DIContainer, ServiceLocator],
  exports: [DIContainer, ServiceLocator],
})
export class DIModule {}

/**
 * DI Module configuration
 */
export const DI_MODULE_CONFIG = {
  isGlobal: true,
  imports: [],
  providers: [DIContainer, ServiceLocator],
  exports: [DIContainer, ServiceLocator],
};
