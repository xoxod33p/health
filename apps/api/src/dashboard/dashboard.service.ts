import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Customer, CustomerDocument } from '../customers/customer.schema';
import { Notification, NotificationDocument } from '../notifications/notification.schema';
import { RedisService } from '../redis/redis.service';
import { Sensor, SensorDocument } from '../sensors/sensor.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Customer.name) private readonly customers: Model<CustomerDocument>,
    @InjectModel(Sensor.name) private readonly sensors: Model<SensorDocument>,
    @InjectModel(Notification.name) private readonly notifications: Model<NotificationDocument>,
    private readonly redis: RedisService,
  ) {}

  async summary(user: AuthenticatedUser) {
    const companyId = user.companyId;
    const cacheKey = `dashboard:summary:${companyId}:${user.authUserId}`;

    // Try reading from Redis cache first
    const cached = await this.redis.get<Record<string, number>>(cacheKey);
    if (cached) {
      return cached;
    }

    const [totalCustomers, activeCustomers, totalSensors, activeSensors, expiringSensors, expiredSensors, unreadNotifications] =
      await Promise.all([
        this.customers.countDocuments({ companyId }).exec(),
        this.customers.countDocuments({ companyId, status: 'ACTIVE' }).exec(),
        this.sensors.countDocuments({ companyId }).exec(),
        this.sensors.countDocuments({ companyId, status: { $in: ['ACTIVE', 'ASSIGNED'] } }).exec(),
        this.sensors
          .countDocuments({
            companyId,
            expiresAt: { $gte: new Date(), $lte: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
            status: { $nin: ['DISABLED', 'REPLACED'] },
          })
          .exec(),
        this.sensors.countDocuments({ companyId, expiresAt: { $lt: new Date() }, status: { $nin: ['DISABLED', 'REPLACED'] } }).exec(),
        this.notifications.countDocuments({ companyId, recipientId: user.authUserId, status: 'UNREAD' }).exec(),
      ]);

    const result = {
      totalCustomers,
      activeCustomers,
      totalSensors,
      activeSensors,
      expiringSensors,
      expiredSensors,
      unreadNotifications,
    };

    // Cache in Redis for 15 seconds
    await this.redis.set(cacheKey, result, 15);

    return result;
  }
}
