import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { SupabaseAuthGuard } from './supabase-auth.guard';

@Module({
  imports: [UsersModule],
  providers: [SupabaseAuthGuard],
  exports: [SupabaseAuthGuard],
})
export class AuthModule {}
