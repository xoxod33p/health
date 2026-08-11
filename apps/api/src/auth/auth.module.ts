import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { PermissionGuard } from './permission.guard';

@Module({
  imports: [UsersModule],
  providers: [SupabaseAuthGuard, PermissionGuard],
  exports: [SupabaseAuthGuard, PermissionGuard, UsersModule],
})
export class AuthModule {}
