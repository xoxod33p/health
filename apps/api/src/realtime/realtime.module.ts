import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../users/user.schema';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [AuthModule, MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
