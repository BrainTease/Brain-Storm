import { Injectable, Inject, Optional } from '@nestjs/common';

/**
 * Dependency Injection Container
 * Manages service registration and resolution
 */
@Injectable()
export class DIContainer {
  private services: Map<string, any> = new Map();
  private singletons: Map<string, any> = new Map();
  private factories: Map<string, () => any> = new Map();

  /**
   * Register a service
   */
  register<T>(token: string, service: T): void {
    this.services.set(token, service);
  }

  /**
   * Register a singleton service
   */
  registerSingleton<T>(token: string, factory: () => T): void {
    this.factories.set(token, factory);
  }

  /**
   * Get a service instance
   */
  get<T>(token: string): T {
    // Check if singleton already created
    if (this.singletons.has(token)) {
      return this.singletons.get(token);
    }

    // Check if service registered
    if (this.services.has(token)) {
      return this.services.get(token);
    }

    // Check if factory registered
    if (this.factories.has(token)) {
      const instance = this.factories.get(token)();
      this.singletons.set(token, instance);
      return instance;
    }

    throw new Error(`Service ${token} not found in DI container`);
  }

  /**
   * Check if service is registered
   */
  has(token: string): boolean {
    return this.services.has(token) || this.factories.has(token) || this.singletons.has(token);
  }

  /**
   * Remove a service
   */
  remove(token: string): void {
    this.services.delete(token);
    this.factories.delete(token);
    this.singletons.delete(token);
  }

  /**
   * Clear all services
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
  }

  /**
   * Get all registered services
   */
  getAll(): string[] {
    const all = new Set([...this.services.keys(), ...this.factories.keys(), ...this.singletons.keys()]);
    return Array.from(all);
  }
}

/**
 * Service locator pattern (use sparingly)
 */
@Injectable()
export class ServiceLocator {
  constructor(private container: DIContainer) {}

  getService<T>(token: string): T {
    return this.container.get<T>(token);
  }

  hasService(token: string): boolean {
    return this.container.has(token);
  }
}

/**
 * Dependency injection decorator for property injection
 */
export function InjectService(token: string) {
  return Inject(token);
}

/**
 * Optional dependency injection
 */
export function InjectOptional(token: string) {
  return Optional();
}

/**
 * Factory provider helper
 */
export function createFactory<T>(factory: () => T) {
  return {
    provide: factory.name,
    useFactory: factory,
  };
}

/**
 * Value provider helper
 */
export function createValue<T>(token: string, value: T) {
  return {
    provide: token,
    useValue: value,
  };
}

/**
 * Class provider helper
 */
export function createClass<T>(token: string, useClass: new () => T) {
  return {
    provide: token,
    useClass,
  };
}

/**
 * Async factory provider helper
 */
export function createAsyncFactory<T>(token: string, factory: () => Promise<T>) {
  return {
    provide: token,
    useFactory: factory,
    isGlobal: true,
  };
}
