import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { Customer, CustomerSchema } from '../customers/customer.schema';
import { Notification, NotificationSchema } from '../notifications/notification.schema';
import { RealtimeModule } from '../realtime/realtime.module';
import { SensorReplacement, SensorReplacementSchema } from '../sensors/sensor-replacement.schema';
import { Sensor, SensorSchema } from '../sensors/sensor.schema';
import { SensorType, SensorTypeSchema } from '../sensor-types/sensor-type.schema';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Report, ReportSchema } from './report.schema';

@Module({
  imports: [
    AuthModule,
    AuditModule,
    RealtimeModule,
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: Sensor.name, schema: SensorSchema },
      { name: SensorReplacement.name, schema: SensorReplacementSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: SensorType.name, schema: SensorTypeSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
