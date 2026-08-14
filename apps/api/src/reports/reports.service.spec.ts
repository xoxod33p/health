import { describe, expect, it, jest } from '@jest/globals';
import { ReportsService } from './reports.service';
import type { AuthenticatedUser } from '../auth/auth.types';

describe('ReportsService', () => {
  const mockUser: AuthenticatedUser = {
    authUserId: 'user-123',
    email: 'admin@healthcare.org',
    role: 'SYSTEM_ADMIN',
    companyId: 'company-abc',
  };

  const mockReportDoc: any = {
    _id: '507f1f77bcf86cd799439011',
    companyId: 'company-abc',
    title: 'Test Inventory Report',
    type: 'SENSOR_INVENTORY',
    status: 'READY',
    dateRange: 'ALL_TIME',
    parameters: {},
    summary: { totalSensors: 2, activeSensors: 2 },
    data: [
      { serialNumber: 'SN-001', sensorType: 'ECG', status: 'ACTIVE', customerName: 'John Doe' },
      { serialNumber: 'SN-002', sensorType: 'SPO2', status: 'ACTIVE', customerName: 'Jane Smith' },
    ],
    columns: [
      { key: 'serialNumber', header: 'Serial Number' },
      { key: 'sensorType', header: 'Sensor Type' },
      { key: 'status', header: 'Status' },
      { key: 'customerName', header: 'Customer' },
    ],
    storageFiles: [],
    generatedBy: 'admin@healthcare.org',
    createdAt: new Date(),
    save: jest.fn<any>().mockResolvedValue(true),
  };

  const mockReportsModel: Record<string, any> = {
    create: jest.fn<any>().mockImplementation((doc: any) =>
      Promise.resolve({
        ...doc,
        _id: '507f1f77bcf86cd799439011',
        save: jest.fn<any>().mockResolvedValue(true),
      })
    ),
    find: jest.fn<any>().mockReturnValue({
      sort: jest.fn<any>().mockReturnValue({
        skip: jest.fn<any>().mockReturnValue({
          limit: jest.fn<any>().mockReturnValue({
            exec: jest.fn<any>().mockResolvedValue([mockReportDoc]),
          }),
        }),
      }),
    }),
    countDocuments: jest.fn<any>().mockReturnValue({ exec: jest.fn<any>().mockResolvedValue(1) }),
    findOne: jest.fn<any>().mockReturnValue({
      exec: jest.fn<any>().mockResolvedValue(mockReportDoc),
    }),
    findOneAndDelete: jest.fn<any>().mockReturnValue({
      exec: jest.fn<any>().mockResolvedValue(mockReportDoc),
    }),
    updateOne: jest.fn<any>().mockReturnValue({
      exec: jest.fn<any>().mockResolvedValue({ modifiedCount: 1 }),
    }),
  };

  const mockSensorsModel: Record<string, any> = {
    find: jest.fn<any>().mockReturnValue({
      sort: jest.fn<any>().mockReturnValue({
        lean: jest.fn<any>().mockReturnValue({
          exec: jest.fn<any>().mockResolvedValue([
            { _id: 's1', serialNumber: 'SN-001', sensorTypeId: 't1', customerId: 'c1', status: 'ACTIVE', expiresAt: new Date(Date.now() + 864000000) },
          ]),
        }),
      }),
    }),
    countDocuments: jest.fn<any>().mockReturnValue({ exec: jest.fn<any>().mockResolvedValue(1) }),
  };

  const mockReplacementsModel: Record<string, any> = {
    find: jest.fn<any>().mockReturnValue({
      sort: jest.fn<any>().mockReturnValue({
        lean: jest.fn<any>().mockReturnValue({
          exec: jest.fn<any>().mockResolvedValue([]),
        }),
      }),
    }),
    countDocuments: jest.fn<any>().mockReturnValue({ exec: jest.fn<any>().mockResolvedValue(0) }),
  };

  const mockCustomersModel: Record<string, any> = {
    find: jest.fn<any>().mockReturnValue({
      sort: jest.fn<any>().mockReturnValue({
        lean: jest.fn<any>().mockReturnValue({
          exec: jest.fn<any>().mockResolvedValue([
            { _id: 'c1', customerNumber: 'CUST-001', firstName: 'John', lastName: 'Doe', status: 'ACTIVE' },
          ]),
        }),
      }),
      lean: jest.fn<any>().mockReturnValue({
        exec: jest.fn<any>().mockResolvedValue([
          { _id: 'c1', customerNumber: 'CUST-001', firstName: 'John', lastName: 'Doe', status: 'ACTIVE' },
        ]),
      }),
    }),
    countDocuments: jest.fn<any>().mockReturnValue({ exec: jest.fn<any>().mockResolvedValue(1) }),
  };

  const mockSensorTypesModel: Record<string, any> = {
    find: jest.fn<any>().mockReturnValue({
      lean: jest.fn<any>().mockReturnValue({
        exec: jest.fn<any>().mockResolvedValue([{ _id: 't1', name: 'Pulse Oximeter', code: 'SPO2' }]),
      }),
    }),
    countDocuments: jest.fn<any>().mockReturnValue({ exec: jest.fn<any>().mockResolvedValue(1) }),
  };

  const mockNotificationsModel: Record<string, any> = {
    create: jest.fn<any>().mockResolvedValue({}),
  };

  const mockAuditService: Record<string, any> = {
    record: jest.fn<any>().mockResolvedValue({}),
  };

  const mockRealtimeGateway: Record<string, any> = {
    broadcastCompany: jest.fn<any>(),
  };

  const mockStorageService: Record<string, any> = {
    saveFile: jest.fn<any>().mockImplementation((_c: any, cat: any, fid: any, fn: any, buf: any) =>
      Promise.resolve({
        storageKey: `${cat}/${_c}/${fid}/${fn}`,
        fullPath: `/storage/${cat}/${_c}/${fid}/${fn}`,
        sizeBytes: buf.length,
      })
    ),
    getFile: jest.fn<any>().mockImplementation(() => Promise.resolve(Buffer.from('mock-file-content'))),
    deleteFile: jest.fn<any>().mockResolvedValue(true),
    fileExists: jest.fn<any>().mockResolvedValue(true),
  };

  const createService = () =>
    new ReportsService(
      mockReportsModel as any,
      mockSensorsModel as any,
      mockReplacementsModel as any,
      mockCustomersModel as any,
      mockSensorTypesModel as any,
      mockNotificationsModel as any,
      mockAuditService as any,
      mockRealtimeGateway as any,
      mockStorageService as any,
    );

  it('creates, generates, and persists a sensor inventory report to storage', async () => {
    const service = createService();
    const result = await service.create(mockUser, { type: 'SENSOR_INVENTORY' });

    expect(result).toBeDefined();
    expect(result.type).toBe('SENSOR_INVENTORY');
    expect(mockStorageService.saveFile).toHaveBeenCalledTimes(3); // CSV, Excel, PDF
    expect(mockNotificationsModel.create).toHaveBeenCalled();
    expect(mockRealtimeGateway.broadcastCompany).toHaveBeenCalled();
    expect(mockAuditService.record).toHaveBeenCalled();
  });

  it('exports a report as CSV from storage', async () => {
    const service = createService();
    const result = await service.exportReport(mockUser, '507f1f77bcf86cd799439011', 'csv');

    expect(result.contentType).toBe('text/csv');
    expect(result.filename.endsWith('.csv')).toBe(true);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it('exports a report as Excel (.xlsx) from storage', async () => {
    const service = createService();
    const result = await service.exportReport(mockUser, '507f1f77bcf86cd799439011', 'excel');

    expect(result.contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(result.filename.endsWith('.xlsx')).toBe(true);
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it('exports a report as PDF from storage', async () => {
    const service = createService();
    const result = await service.exportReport(mockUser, '507f1f77bcf86cd799439011', 'pdf');

    expect(result.contentType).toBe('application/pdf');
    expect(result.filename.endsWith('.pdf')).toBe(true);
    expect(result.buffer.length).toBeGreaterThan(0);
  });
});
