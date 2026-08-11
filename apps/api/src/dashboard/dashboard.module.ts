import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Customer, CustomerSchema } from '../customers/customer.schema';
import { Notification, NotificationSchema } from '../notifications/notification.schema';
import { Sensor, SensorSchema } from '../sensors/sensor.schema';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AuthModule, MongooseModule.forFeature([{ name: Customer.name, schema: CustomerSchema }, { name: Sensor.name, schema: SensorSchema }, { name: Notification.name, schema: NotificationSchema }])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
