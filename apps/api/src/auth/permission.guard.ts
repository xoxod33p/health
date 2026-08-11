import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from './auth.types';
import { PERMISSIONS_KEY, roleHasPermission } from './permissions';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? [];
    if (required.length === 0) return true;
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (required.every((permission) => roleHasPermission(user.role, permission))) return true;
    throw new ForbiddenException('Insufficient permissions');
  }
}
