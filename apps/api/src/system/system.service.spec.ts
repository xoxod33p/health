import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AuditLog } from '../audit/audit.schema';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Customer } from '../customers/customer.schema';
import { Employee } from '../employees/employee.schema';
import { Notification } from '../notifications/notification.schema';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { Report } from '../reports/report.schema';
import { SensorAssignment } from '../sensors/sensor-assignment.schema';
import { SensorReplacement } from '../sensors/sensor-replacement.schema';
import { Sensor } from '../sensors/sensor.schema';
import { SensorType } from '../sensor-types/sensor-type.schema';
import { StorageService } from '../storage/storage.service';
import { User } from '../users/user.schema';
import { SystemService } from './system.service';

describe('SystemService', () => {
  let service: SystemService;

  const mockModel = () => ({
    countDocuments: jest.fn().mockResolvedValue(5),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 5 }),
    create: jest.fn().mockResolvedValue({}),
  });

  const mockCustomerModel = mockModel();
  const mockSensorModel = mockModel();
  const mockSensorTypeModel = mockModel();
  const mockSensorAssignmentModel = mockModel();
  const mockSensorReplacementModel = mockModel();
  const mockReportModel = mockModel();
  const mockNotificationModel = mockModel();
  const mockAuditLogModel = mockModel();
  const mockUserModel = mockModel();
  const mockEmployeeModel = mockModel();

  const mockRealtimeGateway = {
    broadcastCompany: jest.fn(),
  };

  const mockStorageService = {
    clearAllStorage: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'DEFAULT_ADMIN_EMAIL') return 'admin@localhost.test';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RealtimeGateway, useValue: mockRealtimeGateway },
        { provide: StorageService, useValue: mockStorageService },
        { provide: getModelToken(Customer.name), useValue: mockCustomerModel },
        { provide: getModelToken(Sensor.name), useValue: mockSensorModel },
        { provide: getModelToken(SensorType.name), useValue: mockSensorTypeModel },
        { provide: getModelToken(SensorAssignment.name), useValue: mockSensorAssignmentModel },
        { provide: getModelToken(SensorReplacement.name), useValue: mockSensorReplacementModel },
        { provide: getModelToken(Report.name), useValue: mockReportModel },
        { provide: getModelToken(Notification.name), useValue: mockNotificationModel },
        { provide: getModelToken(AuditLog.name), useValue: mockAuditLogModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Employee.name), useValue: mockEmployeeModel },
      ],
    }).compile();

    service = module.get<SystemService>(SystemService);
    jest.clearAllMocks();
  });

  it('should identify default admin correctly', () => {
    const defaultAdmin: AuthenticatedUser = {
      authUserId: 'admin_1',
      email: 'admin@localhost.test',
      role: 'SYSTEM_ADMIN',
      companyId: 'company_1',
    };
    const otherAdmin: AuthenticatedUser = {
      authUserId: 'admin_2',
      email: 'other.admin@company.com',
      role: 'SYSTEM_ADMIN',
      companyId: 'company_1',
    };

    expect(service.isDefaultAdmin(defaultAdmin)).toBe(true);
    expect(service.isDefaultAdmin(otherAdmin)).toBe(false);
  });

  it('should throw ForbiddenException if non-default admin calls clearAllData', async () => {
    const nonDefaultAdmin: AuthenticatedUser = {
      authUserId: 'user_2',
      email: 'staff@company.com',
      role: 'SYSTEM_ADMIN',
      companyId: 'company_1',
    };

    await expect(service.clearAllData(nonDefaultAdmin)).rejects.toThrow(ForbiddenException);
    expect(mockCustomerModel.deleteMany).not.toHaveBeenCalled();
    expect(mockUserModel.deleteMany).not.toHaveBeenCalled();
  });

  it('should clear operational collections and preserve users when called by default admin', async () => {
    const defaultAdmin: AuthenticatedUser = {
      authUserId: 'admin_1',
      email: 'admin@localhost.test',
      role: 'SYSTEM_ADMIN',
      companyId: 'company_1',
    };

    const result = await service.clearAllData(defaultAdmin);

    expect(result.success).toBe(true);
    // Operational data deleted
    expect(mockCustomerModel.deleteMany).toHaveBeenCalledWith({ companyId: 'company_1' });
    expect(mockSensorModel.deleteMany).toHaveBeenCalledWith({ companyId: 'company_1' });
    expect(mockSensorTypeModel.deleteMany).toHaveBeenCalledWith({ companyId: 'company_1' });
    expect(mockSensorAssignmentModel.deleteMany).toHaveBeenCalledWith({ companyId: 'company_1' });
    expect(mockSensorReplacementModel.deleteMany).toHaveBeenCalledWith({ companyId: 'company_1' });
    expect(mockReportModel.deleteMany).toHaveBeenCalledWith({ companyId: 'company_1' });
    expect(mockNotificationModel.deleteMany).toHaveBeenCalledWith({ companyId: 'company_1' });
    expect(mockAuditLogModel.deleteMany).toHaveBeenCalledWith({ companyId: 'company_1' });
    expect(mockStorageService.clearAllStorage).toHaveBeenCalled();

    // Users and Employees MUST NOT be deleted
    expect(mockUserModel.deleteMany).not.toHaveBeenCalled();
    expect(mockEmployeeModel.deleteMany).not.toHaveBeenCalled();

    // User counts queried for preservation summary
    expect(mockUserModel.countDocuments).toHaveBeenCalledWith({ companyId: 'company_1' });
    expect(mockEmployeeModel.countDocuments).toHaveBeenCalledWith({ companyId: 'company_1' });

    // Realtime notification broadcast
    expect(mockRealtimeGateway.broadcastCompany).toHaveBeenCalledWith(
      'company_1',
      'system.data_cleared',
      expect.objectContaining({ wipedBy: 'admin@localhost.test' }),
    );
  });
});
