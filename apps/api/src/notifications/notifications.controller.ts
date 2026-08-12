import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/permissions';
import { MongoJwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationQueryDto } from './notification.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(MongoJwtAuthGuard, PermissionGuard)
@RequirePermissions('notification.view')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get() findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: NotificationQueryDto) { return this.notifications.findAll(user, query); }
  @Get('unread-count') unreadCount(@CurrentUser() user: AuthenticatedUser) { return this.notifications.unreadCount(user); }
  @Patch('read-all') markAllRead(@CurrentUser() user: AuthenticatedUser) { return this.notifications.markAllRead(user); }
  @Patch(':id/read') markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.notifications.markRead(user, id); }
}
