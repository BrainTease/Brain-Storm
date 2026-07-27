import { Test, TestingModule } from '@nestjs/testing';
import { DIContainer, ServiceLocator } from './di.container';

describe('DIContainer', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  describe('register', () => {
    it('should register a service', () => {
      const service = { name: 'test' };
      container.register('TestService', service);
      expect(container.get('TestService')).toBe(service);
    });

    it('should overwrite existing service', () => {
      container.register('TestService', { name: 'first' });
      container.register('TestService', { name: 'second' });
      expect(container.get('TestService').name).toBe('second');
    });
  });

  describe('registerSingleton', () => {
    it('should create singleton on first access', () => {
      let callCount = 0;
      container.registerSingleton('SingletonService', () => {
        callCount++;
        return { id: callCount };
      });

      const first = container.get('SingletonService');
      const second = container.get('SingletonService');

      expect(first).toBe(second);
      expect(callCount).toBe(1);
    });
  });

  describe('get', () => {
    it('should throw error for unregistered service', () => {
      expect(() => container.get('UnknownService')).toThrow('Service UnknownService not found');
    });

    it('should return registered service', () => {
      const service = { name: 'test' };
      container.register('TestService', service);
      expect(container.get('TestService')).toBe(service);
    });
  });

  describe('has', () => {
    it('should return true for registered service', () => {
      container.register('TestService', {});
      expect(container.has('TestService')).toBe(true);
    });

    it('should return false for unregistered service', () => {
      expect(container.has('UnknownService')).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove registered service', () => {
      container.register('TestService', {});
      container.remove('TestService');
      expect(container.has('TestService')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all services', () => {
      container.register('Service1', {});
      container.register('Service2', {});
      container.clear();
      expect(container.getAll()).toHaveLength(0);
    });
  });

  describe('getAll', () => {
    it('should return all registered services', () => {
      container.register('Service1', {});
      container.register('Service2', {});
      container.registerSingleton('Service3', () => ({}));

      const all = container.getAll();
      expect(all).toContain('Service1');
      expect(all).toContain('Service2');
      expect(all).toContain('Service3');
    });
  });
});

describe('ServiceLocator', () => {
  let container: DIContainer;
  let locator: ServiceLocator;

  beforeEach(() => {
    container = new DIContainer();
    locator = new ServiceLocator(container);
  });

  it('should get service from container', () => {
    const service = { name: 'test' };
    container.register('TestService', service);
    expect(locator.getService('TestService')).toBe(service);
  });

  it('should check if service exists', () => {
    container.register('TestService', {});
    expect(locator.hasService('TestService')).toBe(true);
    expect(locator.hasService('UnknownService')).toBe(false);
  });
});
