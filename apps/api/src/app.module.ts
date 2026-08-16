import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import Joi from 'joi';
import { resolve } from 'node:path';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EmployeesModule } from './employees/employees.module';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ReportsModule } from './reports/reports.module';
import { SensorsModule } from './sensors/sensors.module';
import { SensorTypesModule } from './sensor-types/sensor-types.module';
import { StorageModule } from './storage/storage.module';
import { SystemModule } from './system/system.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(__dirname, '../../../.env'), resolve(process.cwd(), '.env')],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'staging', 'production').default('development'),
        PORT: Joi.number().port().default(3001),
        WEB_ORIGIN: Joi.string().empty('').default('http://localhost:3000'),
        MONGODB_URI: Joi.string().uri().empty('').default('mongodb://healthcare:healthcare_prod_secret_123!@mongodb:27017/healthcare?authSource=admin'),
        JWT_SECRET: Joi.string().min(16).empty('').default('care_signal_secure_prod_jwt_secret_99812_key!'),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    MongooseModule.forRootAsync({
      useFactory: (config: ConfigService) => ({ uri: config.getOrThrow<string>('MONGODB_URI') }),
      inject: [ConfigService],
    }),
    StorageModule,
    UsersModule,
    AuthModule,
    AuditModule,
    CustomersModule,
    DashboardModule,
    EmployeesModule,
    SensorsModule,
    SensorTypesModule,
    NotificationsModule,
    RealtimeModule,
    ReportsModule,
    HealthModule,
    SystemModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
