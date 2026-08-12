import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { SensorType, SensorTypeSchema } from './sensor-type.schema';
import { SensorTypesController } from './sensor-types.controller';
import { SensorTypesService } from './sensor-types.service';

@Module({
  imports: [AuthModule, MongooseModule.forFeature([{ name: SensorType.name, schema: SensorTypeSchema }])],
  controllers: [SensorTypesController],
  providers: [SensorTypesService],
  exports: [SensorTypesService, MongooseModule],
})
export class SensorTypesModule {}
