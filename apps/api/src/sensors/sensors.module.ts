import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Customer, CustomerSchema } from '../customers/customer.schema';
import { Sensor, SensorSchema } from './sensor.schema';
import { SensorAssignment, SensorAssignmentSchema } from './sensor-assignment.schema';
import { SensorsController } from './sensors.controller';
import { SensorsService } from './sensors.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [AuthModule, RealtimeModule, MongooseModule.forFeature([
    { name: Sensor.name, schema: SensorSchema },
    { name: SensorAssignment.name, schema: SensorAssignmentSchema },
    { name: Customer.name, schema: CustomerSchema },
  ])],
  controllers: [SensorsController],
  providers: [SensorsService],
})
export class SensorsModule {}
