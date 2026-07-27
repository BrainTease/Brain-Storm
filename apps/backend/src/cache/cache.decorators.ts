import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CACHE_TTL_KEY = 'cache:ttl';
export const CACHE_PREFIX_KEY = 'cache:prefix';

export const Cacheable = (ttlSeconds: number = 600, prefix?: string) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_TTL_KEY, ttlSeconds)(target, propertyKey, descriptor);
    if (prefix) {
      SetMetadata(CACHE_PREFIX_KEY, prefix)(target, propertyKey, descriptor);
    }
    return descriptor;
  };
};

export const InvalidateCache = (patterns: string[] | string) => {
  return SetMetadata('cache:invalidate', Array.isArray(patterns) ? patterns : [patterns]);
};
