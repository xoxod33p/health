import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Customer, CustomerSchema } from '../customers/customer.schema';
import { SensorType, SensorTypeSchema } from '../sensor-types/sensor-type.schema';
import { Sensor, SensorSchema } from './sensor.schema';
import { SensorAssignment, SensorAssignmentSchema } from './sensor-assignment.schema';
import { SensorReplacement, SensorReplacementSchema } from './sensor-replacement.schema';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuthModule,
    RealtimeModule,
    AuditModule,
    MongooseModule.forFeature([
      { name: Sensor.name, schema: SensorSchema },
      { name: SensorAssignment.name, schema: SensorAssignmentSchema },
      { name: SensorReplacement.name, schema: SensorReplacementSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: SensorType.name, schema: SensorTypeSchema },
    ]),
  ],
  controllers: [SensorsController],
  providers: [SensorsService],
  exports: [SensorsService],
})
export class SensorsModule {}
