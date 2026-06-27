import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { OrganizationsService } from '../organizations.service';

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private orgsService: OrganizationsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const orgId = request.params.orgId || request.body?.orgId;
    const user = request.user as any;

    if (!orgId || !user?.id) return false;

    const member = await this.orgsService.getOrganizationMembers(orgId);
    const isMember = member.some((m) => m.userId === user.id);

    if (!isMember) {
      throw new ForbiddenException('Not a member of this organization');
    }

    return true;
  }
}
