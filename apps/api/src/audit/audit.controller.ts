import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/permissions';
import { MongoJwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditQueryDto } from './audit.dto';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(MongoJwtAuthGuard, PermissionGuard)
@RequirePermissions('audit.view')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: AuditQueryDto) {
    return this.audit.findAll(user, query);
  }
}
