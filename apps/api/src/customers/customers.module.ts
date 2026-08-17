import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Customer, CustomerSchema } from './customer.schema';
import { Sensor, SensorSchema } from '../sensors/sensor.schema';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    AuthModule,
    RealtimeModule,
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Sensor.name, schema: SensorSchema },
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
