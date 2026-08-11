import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/permissions';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(SupabaseAuthGuard, PermissionGuard)
@RequirePermissions('customer.view')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}
  @Get('summary') summary(@CurrentUser() user: AuthenticatedUser) { return this.dashboard.summary(user); }
}
