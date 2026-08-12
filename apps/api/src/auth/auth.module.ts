import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { MongoJwtAuthGuard } from './jwt-auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, MongoJwtAuthGuard, PermissionGuard],
  exports: [AuthService, MongoJwtAuthGuard, PermissionGuard, UsersModule],
})
export class AuthModule {}
