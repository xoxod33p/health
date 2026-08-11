import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { HealthModule } from './health/health.module';
import { SensorsModule } from './sensors/sensors.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'staging', 'production').default('development'),
        PORT: Joi.number().port().default(3001),
        WEB_ORIGIN: Joi.string().required(),
        MONGODB_URI: Joi.string().uri().required(),
        SUPABASE_URL: Joi.string().uri().allow('').default(''),
      }),
    }),
    MongooseModule.forRootAsync({
      useFactory: (config: ConfigService) => ({ uri: config.getOrThrow<string>('MONGODB_URI') }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    CustomersModule,
    SensorsModule,
    HealthModule,
  ],
})
export class AppModule {}
