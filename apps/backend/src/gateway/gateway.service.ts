import { Injectable } from '@nestjs/common';

export interface RouteDefinition {
  path: string;
  methods: string[];
  upstream: string;
  authRequired: boolean;
  rateLimitTier: string;
}

const ROUTES: RouteDefinition[] = [
  { path: '/v1/auth/**',         methods: ['GET','POST'],        upstream: 'backend', authRequired: false, rateLimitTier: 'auth' },
  { path: '/v1/courses/**',      methods: ['GET','POST','PATCH','DELETE'], upstream: 'backend', authRequired: true,  rateLimitTier: 'default' },
  { path: '/v1/users/**',        methods: ['GET','PATCH','DELETE'], upstream: 'backend', authRequired: true,  rateLimitTier: 'default' },
  { path: '/v1/stellar/**',      methods: ['GET','POST'],        upstream: 'backend', authRequired: true,  rateLimitTier: 'write' },
  { path: '/v1/credentials/**',  methods: ['GET','POST'],        upstream: 'backend', authRequired: true,  rateLimitTier: 'default' },
  { path: '/v1/secrets/**',      methods: ['GET','POST'],        upstream: 'backend', authRequired: true,  rateLimitTier: 'admin' },
  { path: '/v1/metrics/**',      methods: ['GET'],               upstream: 'backend', authRequired: true,  rateLimitTier: 'admin' },
  { path: '/v1/health',          methods: ['GET'],               upstream: 'backend', authRequired: false, rateLimitTier: 'default' },
];

@Injectable()
export class GatewayService {
  getRoutes(): RouteDefinition[] {
    return ROUTES;
  }

  resolveRoute(method: string, path: string): RouteDefinition | null {
    return ROUTES.find((r) => {
      const pattern = r.path.replace('**', '.*');
      return r.methods.includes(method.toUpperCase()) && new RegExp(`^${pattern}$`).test(path);
    }) ?? null;
  }

  getHealthSummary(): { status: string; routes: number; version: string } {
    return { status: 'ok', routes: ROUTES.length, version: process.env.APP_VERSION ?? 'unknown' };
  }
}
