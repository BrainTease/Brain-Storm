import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GatewayService } from './gateway.service';

export const SKIP_GATEWAY_AUTH = 'skipGatewayAuth';

@Injectable()
export class GatewayAuthGuard implements CanActivate {
  constructor(
    private readonly gatewayService: GatewayService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_GATEWAY_AUTH, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const req = context.switchToHttp().getRequest();
    const route = this.gatewayService.resolveRoute(req.method, req.url);

    if (!route || !route.authRequired) return true;

    if (!req.user) {
      throw new UnauthorizedException('Authentication required');
    }
    return true;
  }
}
