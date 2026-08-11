import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Customer, CustomerDocument } from '../customers/customer.schema';
import { Notification, NotificationDocument } from '../notifications/notification.schema';
import { Sensor, SensorDocument } from '../sensors/sensor.schema';

@Injectable()
export class DashboardService {
  constructor(@InjectModel(Customer.name) private readonly customers: Model<CustomerDocument>, @InjectModel(Sensor.name) private readonly sensors: Model<SensorDocument>, @InjectModel(Notification.name) private readonly notifications: Model<NotificationDocument>) {}

  async summary(user: AuthenticatedUser) {
    const companyId = user.companyId;
    const [totalCustomers, activeCustomers, totalSensors, activeSensors, expiringSensors, expiredSensors, unreadNotifications] = await Promise.all([
      this.customers.countDocuments({ companyId }).exec(),
      this.customers.countDocuments({ companyId, status: 'ACTIVE' }).exec(),
      this.sensors.countDocuments({ companyId }).exec(),
      this.sensors.countDocuments({ companyId, status: { $in: ['ACTIVE', 'ASSIGNED'] } }).exec(),
      this.sensors.countDocuments({ companyId, expiresAt: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, status: { $nin: ['DISABLED', 'REPLACED'] } }).exec(),
      this.sensors.countDocuments({ companyId, expiresAt: { $lt: new Date() }, status: { $nin: ['DISABLED', 'REPLACED'] } }).exec(),
      this.notifications.countDocuments({ companyId, recipientId: user.authUserId, status: 'UNREAD' }).exec(),
    ]);
    return { totalCustomers, activeCustomers, totalSensors, activeSensors, expiringSensors, expiredSensors, unreadNotifications };
  }
}
