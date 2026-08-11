import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditQueryDto } from './audit.dto';
import { AuditLog, AuditLogDocument } from './audit.schema';

@Injectable()
export class AuditService {
  constructor(@InjectModel(AuditLog.name) private readonly auditLogs: Model<AuditLogDocument>) {}

  async record(user: AuthenticatedUser, action: string, entityType: string, entityId?: string, newValues?: Record<string, unknown>, oldValues?: Record<string, unknown>): Promise<AuditLog> {
    return this.auditLogs.create({ companyId: user.companyId, actorUserId: user.authUserId, action, entityType, entityId, newValues, oldValues });
  }

  async findAll(user: AuthenticatedUser, query: AuditQueryDto): Promise<AuditLog[]> {
    return this.auditLogs.find({ companyId: user.companyId, ...(query.action ? { action: query.action } : {}), ...(query.entityType ? { entityType: query.entityType } : {}), ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}) }).sort({ createdAt: -1 }).limit(200).lean().exec();
  }
}
