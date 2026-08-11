import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Notification, NotificationSchema } from './notification.schema';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [AuthModule, MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
