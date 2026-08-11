import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { AuditController } from './audit.controller';
import { AuditLog, AuditLogSchema } from './audit.schema';
import { AuditService } from './audit.service';

@Module({
  imports: [AuthModule, MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }])],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
