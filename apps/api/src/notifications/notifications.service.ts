import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Notification, NotificationDocument } from './notification.schema';
import { NotificationQueryDto } from './notification.dto';

@Injectable()
export class NotificationsService {
  constructor(@InjectModel(Notification.name) private readonly notifications: Model<NotificationDocument>) {}

  async findAll(user: AuthenticatedUser, query: NotificationQueryDto): Promise<Notification[]> {
    const filter = { companyId: user.companyId, recipientId: user.authUserId, ...(query.status ? { status: query.status } : {}), ...(query.type ? { type: query.type } : {}) };
    return this.notifications.find(filter).sort({ createdAt: -1 }).limit(100).lean().exec();
  }

  async unreadCount(user: AuthenticatedUser): Promise<{ count: number }> {
    return { count: await this.notifications.countDocuments({ companyId: user.companyId, recipientId: user.authUserId, status: 'UNREAD' }).exec() };
  }

  async markRead(user: AuthenticatedUser, id: string): Promise<Notification> {
    const notification = await this.notifications.findOneAndUpdate({ _id: id, companyId: user.companyId, recipientId: user.authUserId }, { status: 'READ', readAt: new Date() }, { new: true }).lean().exec();
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async markAllRead(user: AuthenticatedUser): Promise<{ updated: number }> {
    const result = await this.notifications.updateMany({ companyId: user.companyId, recipientId: user.authUserId, status: 'UNREAD' }, { status: 'READ', readAt: new Date() }).exec();
    return { updated: result.modifiedCount };
  }
}
