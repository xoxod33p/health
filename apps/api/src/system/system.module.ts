import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from '../audit/audit.schema';
import { Customer, CustomerSchema } from '../customers/customer.schema';
import { Employee, EmployeeSchema } from '../employees/employee.schema';
import { Notification, NotificationSchema } from '../notifications/notification.schema';
import { RealtimeModule } from '../realtime/realtime.module';
import { Report, ReportSchema } from '../reports/report.schema';
import { SensorAssignment, SensorAssignmentSchema } from '../sensors/sensor-assignment.schema';
import { SensorReplacement, SensorReplacementSchema } from '../sensors/sensor-replacement.schema';
import { Sensor, SensorSchema } from '../sensors/sensor.schema';
import { SensorType, SensorTypeSchema } from '../sensor-types/sensor-type.schema';
import { StorageModule } from '../storage/storage.module';
import { User, UserSchema } from '../users/user.schema';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Sensor.name, schema: SensorSchema },
      { name: SensorType.name, schema: SensorTypeSchema },
      { name: SensorAssignment.name, schema: SensorAssignmentSchema },
      { name: SensorReplacement.name, schema: SensorReplacementSchema },
      { name: Report.name, schema: ReportSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: User.name, schema: UserSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
    RealtimeModule,
    StorageModule,
  ],
  controllers: [SystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
