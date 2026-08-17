import { describe, expect, it, jest } from '@jest/globals';
import { AuditService } from './audit.service';
import type { AuthenticatedUser } from '../auth/auth.types';

describe('AuditService', () => {
  const mockUser: AuthenticatedUser = {
    authUserId: 'user-456',
    email: 'marcus.vance@healthcare.org',
    role: 'MANAGER',
    companyId: 'company-abc',
  };

  const mockAuditLogsModel: Record<string, any> = {
    create: jest.fn<any>().mockImplementation((doc: any) => Promise.resolve({ ...doc, _id: 'audit-1' })),
    find: jest.fn<any>().mockReturnValue({
      sort: jest.fn<any>().mockReturnValue({
        limit: jest.fn<any>().mockReturnValue({
          lean: jest.fn<any>().mockReturnValue({
            exec: jest.fn<any>().mockResolvedValue([
              {
                _id: 'audit-1',
                companyId: 'company-abc',
                actorUserId: 'user-456',
                actorEmail: 'marcus.vance@healthcare.org',
                action: 'sensor.assign',
                entityType: 'Sensor',
                createdAt: new Date(),
              },
            ]),
          }),
        }),
      }),
    }),
  };

  const mockEmployeesModel: Record<string, any> = {
    find: jest.fn<any>().mockReturnValue({
      lean: jest.fn<any>().mockReturnValue({
        exec: jest.fn<any>().mockResolvedValue([
          {
            authUserId: 'user-456',
            email: 'marcus.vance@healthcare.org',
            firstName: 'Marcus',
            lastName: 'Vance',
            role: 'MANAGER',
          },
        ]),
      }),
    }),
  };

  const mockUsersModel: Record<string, any> = {
    find: jest.fn<any>().mockReturnValue({
      lean: jest.fn<any>().mockReturnValue({
        exec: jest.fn<any>().mockResolvedValue([]),
      }),
    }),
  };

  const mockRealtimeGateway: Record<string, any> = {
    broadcastCompany: jest.fn(),
  };

  it('records an audit log with actor user information', async () => {
    const service = new AuditService(mockAuditLogsModel as any, mockEmployeesModel as any, mockUsersModel as any, mockRealtimeGateway as any);
    const result = await service.record(mockUser, 'sensor.assign', 'Sensor', '507f1f77bcf86cd799439011');

    expect(result).toBeDefined();
    expect(mockAuditLogsModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-abc',
        actorUserId: 'user-456',
        actorEmail: 'marcus.vance@healthcare.org',
        action: 'sensor.assign',
      })
    );
  });

  it('enriches audit logs with human names and roles on findAll', async () => {
    const service = new AuditService(mockAuditLogsModel as any, mockEmployeesModel as any, mockUsersModel as any, mockRealtimeGateway as any);
    const logs = await service.findAll(mockUser, {});

    expect(logs).toHaveLength(1);
    expect(logs[0].actorName).toBe('Marcus Vance');
    expect(logs[0].actorRole).toBe('MANAGER');
    expect(logs[0].actorEmail).toBe('marcus.vance@healthcare.org');
  });
});
