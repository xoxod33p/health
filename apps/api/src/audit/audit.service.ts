import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Employee, EmployeeDocument } from '../employees/employee.schema';
import { User, UserDocument } from '../users/user.schema';
import { AuditQueryDto } from './audit.dto';
import { AuditLog, AuditLogDocument } from './audit.schema';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private readonly auditLogs: Model<AuditLogDocument>,
    @InjectModel(Employee.name) private readonly employees: Model<EmployeeDocument>,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
  ) {}

  async record(
    user: AuthenticatedUser,
    action: string,
    entityType: string,
    entityId?: string,
    newValues?: Record<string, unknown>,
    oldValues?: Record<string, unknown>,
  ): Promise<AuditLog> {
    const rawEntityId = entityId && Types.ObjectId.isValid(entityId) ? new Types.ObjectId(entityId) : undefined;
    return this.auditLogs.create({
      companyId: user.companyId,
      actorUserId: user.authUserId,
      actorEmail: user.email,
      action,
      entityType,
      ...(rawEntityId ? { entityId: rawEntityId } : {}),
      newValues,
      oldValues,
    });
  }

  async findAll(user: AuthenticatedUser, query: AuditQueryDto): Promise<any[]> {
    const filter = {
      companyId: user.companyId,
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
    };

    const rawLogs = await this.auditLogs
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
      .exec();

    
    const actorUserIds = Array.from(new Set(rawLogs.map((l) => l.actorUserId).filter(Boolean)));
    const actorEmails = Array.from(new Set(rawLogs.map((l) => l.actorEmail).filter(Boolean)));

    const [employeeDocs, userDocs] = await Promise.all([
      this.employees
        .find({
          $or: [
            { authUserId: { $in: actorUserIds } },
            { email: { $in: actorEmails } },
          ],
        })
        .lean()
        .exec(),
      this.users
        .find({
          $or: [
            { authUserId: { $in: actorUserIds } },
            { email: { $in: actorEmails } },
          ],
        })
        .lean()
        .exec(),
    ]);

    const empByAuthId = new Map(employeeDocs.map((e) => [e.authUserId, e]));
    const empByEmail = new Map(employeeDocs.map((e) => [e.email.toLowerCase(), e]));
    const userByAuthId = new Map(userDocs.map((u) => [u.authUserId, u]));
    const userByEmail = new Map(userDocs.map((u) => [u.email.toLowerCase(), u]));

    return rawLogs.map((log) => {
      const emp = empByAuthId.get(log.actorUserId) || (log.actorEmail ? empByEmail.get(log.actorEmail.toLowerCase()) : undefined);
      const usr = userByAuthId.get(log.actorUserId) || (log.actorEmail ? userByEmail.get(log.actorEmail.toLowerCase()) : undefined);

      let actorName = log.actorName;
      if (!actorName) {
        if (emp) {
          actorName = `${emp.firstName} ${emp.lastName}`.trim();
        } else if (usr?.email) {
          actorName = (usr.email.split('@')[0] || 'User').replace(/[._-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        } else if (log.actorEmail) {
          actorName = (log.actorEmail.split('@')[0] || 'User').replace(/[._-]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        } else {
          actorName = log.actorUserId === 'admin' ? 'Root Admin' : log.actorUserId;
        }
      }

      const actorEmail = emp?.email || usr?.email || log.actorEmail;
      const actorRole = emp?.role || usr?.role || (log.actorUserId === 'admin' ? 'SYSTEM_ADMIN' : undefined);
      const actorTitle = emp?.title;

      return {
        ...log,
        actorName,
        actorEmail,
        actorRole,
        actorTitle,
      };
    });
  }
}
