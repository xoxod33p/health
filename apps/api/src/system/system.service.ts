import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../audit/audit.schema';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Customer, CustomerDocument } from '../customers/customer.schema';
import { Employee, EmployeeDocument } from '../employees/employee.schema';
import { Notification, NotificationDocument } from '../notifications/notification.schema';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { Report, ReportDocument } from '../reports/report.schema';
import { SensorAssignment, SensorAssignmentDocument } from '../sensors/sensor-assignment.schema';
import { SensorReplacement, SensorReplacementDocument } from '../sensors/sensor-replacement.schema';
import { Sensor, SensorDocument } from '../sensors/sensor.schema';
import { SensorType, SensorTypeDocument } from '../sensor-types/sensor-type.schema';
import { StorageService } from '../storage/storage.service';
import { User, UserDocument } from '../users/user.schema';

export interface ClearDataResult {
  success: boolean;
  message: string;
  deletedCounts: {
    customers: number;
    sensors: number;
    sensorTypes: number;
    sensorAssignments: number;
    sensorReplacements: number;
    reports: number;
    notifications: number;
    auditLogs: number;
  };
  preserved: {
    users: number;
    employees: number;
  };
}

export interface SystemStats {
  customers: number;
  sensors: number;
  sensorTypes: number;
  sensorAssignments: number;
  sensorReplacements: number;
  reports: number;
  notifications: number;
  auditLogs: number;
  users: number;
  employees: number;
  isDefaultAdmin: boolean;
  defaultAdminEmail: string;
}

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);
  private readonly defaultAdminEmail: string;

  constructor(
    private readonly config: ConfigService,
    private readonly realtime: RealtimeGateway,
    private readonly storageService: StorageService,
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Sensor.name) private readonly sensorModel: Model<SensorDocument>,
    @InjectModel(SensorType.name) private readonly sensorTypeModel: Model<SensorTypeDocument>,
    @InjectModel(SensorAssignment.name) private readonly sensorAssignmentModel: Model<SensorAssignmentDocument>,
    @InjectModel(SensorReplacement.name) private readonly sensorReplacementModel: Model<SensorReplacementDocument>,
    @InjectModel(Report.name) private readonly reportModel: Model<ReportDocument>,
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLogDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
  ) {
    this.defaultAdminEmail = (
      this.config.get<string>('DEFAULT_ADMIN_EMAIL') ||
      process.env.DEFAULT_ADMIN_EMAIL ||
      'admin@localhost.test'
    )
      .toLowerCase()
      .trim();
  }

  isDefaultAdmin(user: AuthenticatedUser): boolean {
    return user.email.toLowerCase().trim() === this.defaultAdminEmail;
  }

  async getStats(user: AuthenticatedUser): Promise<SystemStats> {
    const isDefAdmin = this.isDefaultAdmin(user);
    const filter = { companyId: user.companyId };

    const [
      customers,
      sensors,
      sensorTypes,
      sensorAssignments,
      sensorReplacements,
      reports,
      notifications,
      auditLogs,
      users,
      employees,
    ] = await Promise.all([
      this.customerModel.countDocuments(filter),
      this.sensorModel.countDocuments(filter),
      this.sensorTypeModel.countDocuments(filter),
      this.sensorAssignmentModel.countDocuments(filter),
      this.sensorReplacementModel.countDocuments(filter),
      this.reportModel.countDocuments(filter),
      this.notificationModel.countDocuments(filter),
      this.auditLogModel.countDocuments(filter),
      this.userModel.countDocuments(filter),
      this.employeeModel.countDocuments(filter),
    ]);

    return {
      customers,
      sensors,
      sensorTypes,
      sensorAssignments,
      sensorReplacements,
      reports,
      notifications,
      auditLogs,
      users,
      employees,
      isDefaultAdmin: isDefAdmin,
      defaultAdminEmail: this.defaultAdminEmail,
    };
  }

  async clearAllData(user: AuthenticatedUser): Promise<ClearDataResult> {
    if (!this.isDefaultAdmin(user)) {
      this.logger.warn(`Unauthorized wipe attempt by ${user.email}`);
      throw new ForbiddenException(
        'Access denied. Only the default environment administrator is authorized to clear workspace data.',
      );
    }

    this.logger.log(`Starting workspace data wipe requested by default admin: ${user.email}`);
    const filter = { companyId: user.companyId };

    // Clear all data collections except users and employees
    const [
      customersRes,
      sensorsRes,
      sensorTypesRes,
      assignmentsRes,
      replacementsRes,
      reportsRes,
      notificationsRes,
      auditLogsRes,
    ] = await Promise.all([
      this.customerModel.collection.deleteMany(filter),
      this.sensorModel.collection.deleteMany(filter),
      this.sensorTypeModel.collection.deleteMany(filter),
      this.sensorAssignmentModel.collection.deleteMany(filter),
      this.sensorReplacementModel.collection.deleteMany(filter),
      this.reportModel.collection.deleteMany(filter),
      this.notificationModel.collection.deleteMany(filter),
      this.auditLogModel.collection.deleteMany(filter),
    ]);

    // Clear physical files from storage
    await this.storageService.clearAllStorage();

    // Count preserved users
    const [usersCount, employeesCount] = await Promise.all([
      this.userModel.countDocuments(filter),
      this.employeeModel.countDocuments(filter),
    ]);

    // Log the reset event in audit trail
    await this.auditLogModel.create({
      companyId: user.companyId,
      actorUserId: user.authUserId,
      actorEmail: user.email,
      action: 'SYSTEM_WIPE',
      entityType: 'SYSTEM',
      newValues: {
        action: 'Clear all workspace data (users preserved)',
        clearedAt: new Date().toISOString(),
        preservedUsers: usersCount,
        preservedEmployees: employeesCount,
        deletedCustomers: customersRes?.deletedCount ?? 0,
        deletedSensors: sensorsRes?.deletedCount ?? 0,
        deletedReports: reportsRes?.deletedCount ?? 0,
      },
    });

    // Notify connected realtime clients
    this.realtime.broadcastCompany(user.companyId, 'system.data_cleared', {
      wipedBy: user.email,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Workspace data wiped successfully. Preserved ${usersCount} users and ${employeesCount} employees.`,
    );

    return {
      success: true,
      message: 'All workspace data cleared successfully. All user and employee accounts preserved.',
      deletedCounts: {
        customers: customersRes?.deletedCount ?? 0,
        sensors: sensorsRes?.deletedCount ?? 0,
        sensorTypes: sensorTypesRes?.deletedCount ?? 0,
        sensorAssignments: assignmentsRes?.deletedCount ?? 0,
        sensorReplacements: replacementsRes?.deletedCount ?? 0,
        reports: reportsRes?.deletedCount ?? 0,
        notifications: notificationsRes?.deletedCount ?? 0,
        auditLogs: auditLogsRes?.deletedCount ?? 0,
      },
      preserved: {
        users: usersCount,
        employees: employeesCount,
      },
    };
  }
}
