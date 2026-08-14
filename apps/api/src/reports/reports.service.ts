import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { Customer, CustomerDocument } from '../customers/customer.schema';
import { Notification, NotificationDocument } from '../notifications/notification.schema';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { Sensor, SensorDocument } from '../sensors/sensor.schema';
import { SensorReplacement, SensorReplacementDocument } from '../sensors/sensor-replacement.schema';
import { SensorType, SensorTypeDocument } from '../sensor-types/sensor-type.schema';
import { StorageService } from '../storage/storage.service';
import { CreateReportDto, ReportQueryDto } from './report.dto';
import { Report, ReportDocument, StoredReportFile } from './report.schema';

export interface ExportResult {
  filename: string;
  contentType: string;
  buffer: Buffer;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Report.name) private readonly reports: Model<ReportDocument>,
    @InjectModel(Sensor.name) private readonly sensors: Model<SensorDocument>,
    @InjectModel(SensorReplacement.name) private readonly replacements: Model<SensorReplacementDocument>,
    @InjectModel(Customer.name) private readonly customers: Model<CustomerDocument>,
    @InjectModel(SensorType.name) private readonly sensorTypes: Model<SensorTypeDocument>,
    @InjectModel(Notification.name) private readonly notifications: Model<NotificationDocument>,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeGateway,
    private readonly storage: StorageService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateReportDto): Promise<Report> {
    const companyId = user.companyId;
    const dateRange = dto.dateRange ?? 'ALL_TIME';
    const rangeDates = this.calculateDateRange(dateRange);

    let title = dto.title?.trim();
    let columns: Array<{ key: string; header: string }> = [];
    let summary: Record<string, unknown> = {};
    let data: Array<Record<string, unknown>> = [];

    switch (dto.type) {
      case 'SENSOR_INVENTORY': {
        if (!title) title = `Sensor Inventory Report (${new Date().toLocaleDateString('en-US')})`;
        const res = await this.buildSensorInventoryData(companyId, dto, rangeDates);
        columns = res.columns;
        summary = res.summary;
        data = res.data;
        break;
      }
      case 'EXPIRATION_REPLACEMENT': {
        if (!title) title = `Expiration & Replacement Report (${new Date().toLocaleDateString('en-US')})`;
        const res = await this.buildExpirationReplacementData(companyId, rangeDates);
        columns = res.columns;
        summary = res.summary;
        data = res.data;
        break;
      }
      case 'CUSTOMER_COVERAGE': {
        if (!title) title = `Customer Device Coverage Report (${new Date().toLocaleDateString('en-US')})`;
        const res = await this.buildCustomerCoverageData(companyId);
        columns = res.columns;
        summary = res.summary;
        data = res.data;
        break;
      }
      case 'OPERATIONAL_SUMMARY': {
        if (!title) title = `Operational Summary Report (${new Date().toLocaleDateString('en-US')})`;
        const res = await this.buildOperationalSummaryData(companyId);
        columns = res.columns;
        summary = res.summary;
        data = res.data;
        break;
      }
      default:
        throw new BadRequestException('Invalid report type');
    }

    const report = await this.reports.create({
      companyId,
      title,
      type: dto.type,
      status: 'READY',
      dateRange,
      parameters: { statusFilter: dto.statusFilter, sensorTypeId: dto.sensorTypeId },
      summary,
      data,
      columns,
      storageFiles: [],
      generatedBy: user.email || 'System User',
    });

    // Generate & save all 3 formats to persistent storage
    const storageFiles = await this.saveReportToStorage(report);
    report.storageFiles = storageFiles;
    await report.save();

    // Create a real-time in-app notification
    await this.notifications.create({
      companyId,
      recipientId: user.authUserId,
      type: 'REPORT_READY',
      title: 'Report Generated',
      body: `Your ${title} is ready and archived in persistent storage.`,
      status: 'UNREAD',
      entityType: 'REPORT',
      entityId: report._id.toString(),
    });

    this.realtime.broadcastCompany(companyId, 'report.ready', {
      reportId: report._id.toString(),
      title: report.title,
      type: report.type,
    });

    await this.audit.record(user, 'report.generate', 'Report', report._id.toString(), {
      title: report.title,
      type: report.type,
      recordsCount: data.length,
      storedFiles: storageFiles.map((f) => f.format),
    });

    return report;
  }

  async findAll(user: AuthenticatedUser, query: ReportQueryDto): Promise<{ data: Report[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const filter: FilterQuery<ReportDocument> = { companyId: user.companyId };
    if (query.type) filter.type = query.type;

    const [data, total] = await Promise.all([
      this.reports.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
      this.reports.countDocuments(filter).exec(),
    ]);

    // Ensure legacy/previous reports have their files archived in storage
    for (const report of data) {
      if (!report.storageFiles || report.storageFiles.length === 0) {
        void this.saveReportToStorage(report).then(async (files) => {
          report.storageFiles = files;
          await report.save();
        });
      }
    }

    return { data: data.map((d) => d.toObject ? d.toObject() : d) as Report[], total, page, limit };
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<Report> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid report ID');
    const report = await this.reports.findOne({ _id: id, companyId: user.companyId }).exec();
    if (!report) throw new NotFoundException('Report not found');

    // If legacy report is missing storage files, auto-archive now
    if (!report.storageFiles || report.storageFiles.length === 0) {
      report.storageFiles = await this.saveReportToStorage(report);
      await report.save();
    }

    return (report.toObject ? report.toObject() : report) as Report;
  }

  async stats(user: AuthenticatedUser): Promise<{ total: number; inventory: number; expiration: number; coverage: number; summary: number }> {
    const companyId = user.companyId;
    const [total, inventory, expiration, coverage, summary] = await Promise.all([
      this.reports.countDocuments({ companyId }).exec(),
      this.reports.countDocuments({ companyId, type: 'SENSOR_INVENTORY' }).exec(),
      this.reports.countDocuments({ companyId, type: 'EXPIRATION_REPLACEMENT' }).exec(),
      this.reports.countDocuments({ companyId, type: 'CUSTOMER_COVERAGE' }).exec(),
      this.reports.countDocuments({ companyId, type: 'OPERATIONAL_SUMMARY' }).exec(),
    ]);
    return { total, inventory, expiration, coverage, summary };
  }

  async delete(user: AuthenticatedUser, id: string): Promise<{ deleted: boolean }> {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid report ID');
    const report = await this.reports.findOneAndDelete({ _id: id, companyId: user.companyId }).exec();
    if (!report) throw new NotFoundException('Report not found');

    // Clean up stored files
    if (report.storageFiles && report.storageFiles.length > 0) {
      for (const file of report.storageFiles) {
        if (file.storageKey) void this.storage.deleteFile(file.storageKey);
      }
    }

    await this.audit.record(user, 'report.delete', 'Report', id, { title: report.title });
    return { deleted: true };
  }

  async exportReport(user: AuthenticatedUser, id: string, format: 'csv' | 'excel' | 'pdf' | 'xlsx' = 'csv'): Promise<ExportResult> {
    const report = await this.findOne(user, id);
    const normalizedFormat = format === 'xlsx' ? 'excel' : format;
    const sanitizedTitle = report.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

    await this.audit.record(user, 'report.export', 'Report', id, { format: normalizedFormat, title: report.title });

    // Check if the file is already archived in storage
    const storedFile = report.storageFiles?.find((f) => f.format === normalizedFormat || (normalizedFormat === 'excel' && f.format === 'xlsx'));
    if (storedFile) {
      const buffer = await this.storage.getFile(storedFile.storageKey);
      if (buffer) {
        return {
          filename: storedFile.filename,
          contentType: storedFile.mimeType,
          buffer,
        };
      }
    }

    // If missing from storage (e.g. previous legacy report), generate and archive to storage
    const storageFiles = await this.saveReportToStorage(report);
    await this.reports.updateOne({ _id: id }, { storageFiles }).exec();

    const freshlyStored = storageFiles.find((f) => f.format === normalizedFormat || (normalizedFormat === 'excel' && f.format === 'xlsx'));
    if (freshlyStored) {
      const buffer = await this.storage.getFile(freshlyStored.storageKey);
      if (buffer) {
        return {
          filename: freshlyStored.filename,
          contentType: freshlyStored.mimeType,
          buffer,
        };
      }
    }

    // Direct fallback if storage I/O fails
    if (normalizedFormat === 'excel') {
      const buffer = await this.generateExcelBuffer(report);
      return {
        filename: `${sanitizedTitle}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer,
      };
    }
    if (normalizedFormat === 'pdf') {
      const buffer = await this.generatePdfBuffer(report);
      return {
        filename: `${sanitizedTitle}.pdf`,
        contentType: 'application/pdf',
        buffer,
      };
    }
    const buffer = Buffer.from(this.generateCsvString(report), 'utf-8');
    return {
      filename: `${sanitizedTitle}.csv`,
      contentType: 'text/csv',
      buffer,
    };
  }

  // --- Storage Archival Helper ---

  async saveReportToStorage(report: Report | ReportDocument): Promise<StoredReportFile[]> {
    const reportId = (report as any)._id?.toString() || 'temp-id';
    const companyId = report.companyId;
    const subcategory = (report.type || 'general').toLowerCase().replace(/_/g, '-');
    const sanitizedTitle = report.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

    // 1. Generate CSV
    const csvString = this.generateCsvString(report);
    const csvBuffer = Buffer.from(csvString, 'utf-8');
    const csvFilename = `${sanitizedTitle}.csv`;
    const csvStored = await this.storage.saveFile(companyId, 'reports', reportId, csvFilename, csvBuffer, subcategory);

    // 2. Generate Excel
    const excelBuffer = await this.generateExcelBuffer(report);
    const excelFilename = `${sanitizedTitle}.xlsx`;
    const excelStored = await this.storage.saveFile(companyId, 'reports', reportId, excelFilename, excelBuffer, subcategory);

    // 3. Generate PDF
    const pdfBuffer = await this.generatePdfBuffer(report);
    const pdfFilename = `${sanitizedTitle}.pdf`;
    const pdfStored = await this.storage.saveFile(companyId, 'reports', reportId, pdfFilename, pdfBuffer, subcategory);

    return [
      {
        format: 'csv',
        filename: csvFilename,
        storageKey: csvStored.storageKey,
        sizeBytes: csvStored.sizeBytes,
        mimeType: 'text/csv',
        createdAt: new Date(),
      },
      {
        format: 'excel',
        filename: excelFilename,
        storageKey: excelStored.storageKey,
        sizeBytes: excelStored.sizeBytes,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        createdAt: new Date(),
      },
      {
        format: 'pdf',
        filename: pdfFilename,
        storageKey: pdfStored.storageKey,
        sizeBytes: pdfStored.sizeBytes,
        mimeType: 'application/pdf',
        createdAt: new Date(),
      },
    ];
  }

  // --- Data builders ---

  private calculateDateRange(range: string): { from?: Date; to?: Date } {
    const now = new Date();
    if (range === '7_DAYS') {
      return { from: new Date(now.getTime() - 7 * 86400000), to: now };
    }
    if (range === '30_DAYS') {
      return { from: new Date(now.getTime() - 30 * 86400000), to: now };
    }
    if (range === '90_DAYS') {
      return { from: new Date(now.getTime() - 90 * 86400000), to: now };
    }
    return {};
  }

  private async buildSensorInventoryData(
    companyId: string,
    dto: CreateReportDto,
    range: { from?: Date; to?: Date }
  ): Promise<{ columns: Array<{ key: string; header: string }>; summary: Record<string, unknown>; data: Array<Record<string, unknown>> }> {
    const filter: FilterQuery<SensorDocument> = { companyId };
    if (dto.statusFilter && dto.statusFilter !== 'ALL') filter.status = dto.statusFilter;
    if (dto.sensorTypeId) filter.sensorTypeId = dto.sensorTypeId;
    if (range.from) filter.createdAt = { $gte: range.from, $lte: range.to ?? new Date() };

    const [sensorsList, customersList, sensorTypesList] = await Promise.all([
      this.sensors.find(filter).sort({ expiresAt: 1 }).lean().exec(),
      this.customers.find({ companyId }).lean().exec(),
      this.sensorTypes.find({ companyId }).lean().exec(),
    ]);

    const customerMap = new Map(customersList.map((c) => [c._id.toString(), `${c.firstName} ${c.lastName}`]));
    const customerNoMap = new Map(customersList.map((c) => [c._id.toString(), c.customerNumber]));
    const typeMap = new Map(sensorTypesList.map((t) => [t._id.toString(), `${t.name} (${t.code})`]));

    const now = Date.now();
    let activeSensors = 0;
    let expiringIn30Days = 0;
    let expiredSensors = 0;
    let unassignedSensors = 0;

    const data = sensorsList.map((s) => {
      const isAssigned = Boolean(s.customerId);
      const isExpired = s.expiresAt ? new Date(s.expiresAt).getTime() < now : false;
      const daysRemaining = s.expiresAt ? Math.ceil((new Date(s.expiresAt).getTime() - now) / 86400000) : 0;
      const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 30 && s.status !== 'DISABLED' && s.status !== 'REPLACED';

      if (s.status === 'ACTIVE' || s.status === 'ASSIGNED') activeSensors++;
      if (isExpiringSoon) expiringIn30Days++;
      if (isExpired && s.status !== 'DISABLED' && s.status !== 'REPLACED') expiredSensors++;
      if (!isAssigned) unassignedSensors++;

      const cId = s.customerId ? s.customerId.toString() : '';
      return {
        serialNumber: s.serialNumber,
        sensorType: typeMap.get(s.sensorTypeId) ?? (s.sensorTypeId ? s.sensorTypeId : '—'),
        status: s.status,
        customerName: customerMap.get(cId) ?? (s.customerId ? String(s.customerId) : 'Unassigned'),
        customerNumber: customerNoMap.get(cId) ?? '—',
        manufacturer: s.manufacturer || '—',
        model: s.model || '—',
        expiresAt: s.expiresAt ? new Date(s.expiresAt).toLocaleDateString('en-US') : '—',
        daysRemaining: s.expiresAt ? `${daysRemaining} days` : '—',
      };
    });

    const columns = [
      { key: 'serialNumber', header: 'Serial Number' },
      { key: 'sensorType', header: 'Sensor Type' },
      { key: 'status', header: 'Status' },
      { key: 'customerName', header: 'Assigned Customer' },
      { key: 'customerNumber', header: 'Customer ID' },
      { key: 'manufacturer', header: 'Manufacturer' },
      { key: 'model', header: 'Model' },
      { key: 'expiresAt', header: 'Expires At' },
      { key: 'daysRemaining', header: 'Days Remaining' },
    ];

    const summary = {
      totalSensors: sensorsList.length,
      activeSensors,
      expiringIn30Days,
      expiredSensors,
      unassignedSensors,
    };

    return { columns, summary, data };
  }

  private async buildExpirationReplacementData(
    companyId: string,
    range: { from?: Date; to?: Date }
  ): Promise<{ columns: Array<{ key: string; header: string }>; summary: Record<string, unknown>; data: Array<Record<string, unknown>> }> {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000);

    const replFilter: FilterQuery<SensorReplacementDocument> = { companyId };
    if (range.from) replFilter.createdAt = { $gte: range.from, $lte: range.to ?? new Date() };

    const [expiringSensorsList, replacementsList, customersList] = await Promise.all([
      this.sensors
        .find({
          companyId,
          expiresAt: { $lte: thirtyDaysFromNow },
          status: { $nin: ['DISABLED', 'REPLACED'] },
        })
        .sort({ expiresAt: 1 })
        .lean()
        .exec(),
      this.replacements.find(replFilter).sort({ replacedDate: -1 }).lean().exec(),
      this.customers.find({ companyId }).lean().exec(),
    ]);

    const customerMap = new Map(customersList.map((c) => [c._id.toString(), `${c.firstName} ${c.lastName}`]));

    const now = Date.now();
    let expiredCount = 0;
    let expiringCount = 0;

    const data: Array<Record<string, unknown>> = [];

    // Expiring sensors
    for (const s of expiringSensorsList) {
      const expDate = new Date(s.expiresAt);
      const isPast = expDate.getTime() < now;
      const days = Math.ceil((expDate.getTime() - now) / 86400000);
      if (isPast) expiredCount++;
      else expiringCount++;

      const cId = s.customerId ? s.customerId.toString() : '';
      data.push({
        recordType: isPast ? 'EXPIRED SENSOR' : 'EXPIRING SOON',
        serialNumber: s.serialNumber,
        customerName: customerMap.get(cId) ?? 'Unassigned',
        eventDate: expDate.toLocaleDateString('en-US'),
        statusOrReason: isPast ? `Expired (${Math.abs(days)}d ago)` : `Expires in ${days} days`,
        notes: isPast ? 'Immediate replacement required' : 'Schedule replacement dispatch',
      });
    }

    // Replacements
    for (const r of replacementsList) {
      data.push({
        recordType: 'MAINTENANCE REPLACEMENT',
        serialNumber: r.serialNumber,
        customerName: r.customerName || '—',
        eventDate: new Date(r.replacedDate).toLocaleDateString('en-US'),
        statusOrReason: r.issueType || '—',
        notes: r.notes || '—',
      });
    }

    const columns = [
      { key: 'recordType', header: 'Record Type' },
      { key: 'serialNumber', header: 'Serial Number' },
      { key: 'customerName', header: 'Customer' },
      { key: 'eventDate', header: 'Event Date' },
      { key: 'statusOrReason', header: 'Status / Reason' },
      { key: 'notes', header: 'Notes & Actions' },
    ];

    const summary = {
      totalAlerts: expiringSensorsList.length + replacementsList.length,
      expiringSoon: expiringCount,
      expiredSensors: expiredCount,
      replacementsLogged: replacementsList.length,
    };

    return { columns, summary, data };
  }

  private async buildCustomerCoverageData(
    companyId: string
  ): Promise<{ columns: Array<{ key: string; header: string }>; summary: Record<string, unknown>; data: Array<Record<string, unknown>> }> {
    const [customersList, sensorsList] = await Promise.all([
      this.customers.find({ companyId }).sort({ lastName: 1 }).lean().exec(),
      this.sensors.find({ companyId, customerId: { $exists: true, $ne: null } }).lean().exec(),
    ]);

    // Group sensors by customer
    const sensorByCustomer = new Map<string, string[]>();
    for (const s of sensorsList) {
      if (!s.customerId) continue;
      const key = s.customerId.toString();
      const existing = sensorByCustomer.get(key) ?? [];
      existing.push(s.serialNumber);
      sensorByCustomer.set(key, existing);
    }

    let coveredCustomers = 0;
    const data = customersList.map((c) => {
      const assigned = sensorByCustomer.get(c._id.toString()) ?? [];
      if (assigned.length > 0) coveredCustomers++;

      return {
        customerNumber: c.customerNumber,
        fullName: `${c.firstName} ${c.lastName}`,
        email: c.email ?? 'No email',
        phone: c.phone ?? '—',
        status: c.status,
        assignedCount: assigned.length,
        sensorSerials: assigned.length > 0 ? assigned.join(', ') : 'None',
        createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-US') : '—',
      };
    });

    const columns = [
      { key: 'customerNumber', header: 'Customer ID' },
      { key: 'fullName', header: 'Customer Name' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Phone' },
      { key: 'status', header: 'Account Status' },
      { key: 'assignedCount', header: 'Assigned Sensors' },
      { key: 'sensorSerials', header: 'Linked Devices' },
      { key: 'createdAt', header: 'Registered On' },
    ];

    const summary = {
      totalCustomers: customersList.length,
      activeCustomers: customersList.filter((c) => c.status === 'ACTIVE').length,
      customersWithDevices: coveredCustomers,
      coverageRate: customersList.length ? `${Math.round((coveredCustomers / customersList.length) * 100)}%` : '0%',
      totalAssignedSensors: sensorsList.length,
    };

    return { columns, summary, data };
  }

  private async buildOperationalSummaryData(
    companyId: string
  ): Promise<{ columns: Array<{ key: string; header: string }>; summary: Record<string, unknown>; data: Array<Record<string, unknown>> }> {
    const [totalCustomers, activeCustomers, totalSensors, activeSensors, expiringSoon, expired, typesCount, replacementsCount] =
      await Promise.all([
        this.customers.countDocuments({ companyId }).exec(),
        this.customers.countDocuments({ companyId, status: 'ACTIVE' }).exec(),
        this.sensors.countDocuments({ companyId }).exec(),
        this.sensors.countDocuments({ companyId, status: { $in: ['ACTIVE', 'ASSIGNED'] } }).exec(),
        this.sensors
          .countDocuments({
            companyId,
            expiresAt: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 86400000) },
            status: { $nin: ['DISABLED', 'REPLACED'] },
          })
          .exec(),
        this.sensors.countDocuments({ companyId, expiresAt: { $lt: new Date() }, status: { $nin: ['DISABLED', 'REPLACED'] } }).exec(),
        this.sensorTypes.countDocuments({ companyId }).exec(),
        this.replacements.countDocuments({ companyId }).exec(),
      ]);

    const deploymentRate = totalSensors ? `${Math.round((activeSensors / totalSensors) * 100)}%` : '0%';

    const data = [
      { category: 'Customers', metric: 'Total Registered Customers', value: totalCustomers, status: 'Operational', notes: 'All customer profiles' },
      { category: 'Customers', metric: 'Active Customer Accounts', value: activeCustomers, status: 'Healthy', notes: 'In regular clinical service' },
      { category: 'Sensors', metric: 'Total Sensor Inventory', value: totalSensors, status: 'Operational', notes: 'Total devices in registry' },
      { category: 'Sensors', metric: 'Active Devices Deployed', value: activeSensors, status: 'Optimal', notes: `${deploymentRate} utilization` },
      { category: 'Lifecycle', metric: 'Sensors Expiring (<=30 Days)', value: expiringSoon, status: expiringSoon > 0 ? 'Warning' : 'Healthy', notes: 'Scheduled for maintenance' },
      { category: 'Lifecycle', metric: 'Expired Sensor Units', value: expired, status: expired > 0 ? 'Action Needed' : 'Healthy', notes: 'Overdue for replacement' },
      { category: 'Catalog', metric: 'Registered Sensor Types', value: typesCount, status: 'Optimal', notes: 'Hardware models supported' },
      { category: 'Maintenance', metric: 'Total Replacements Logged', value: replacementsCount, status: 'Operational', notes: 'Completed device field replacements' },
    ];

    const columns = [
      { key: 'category', header: 'Category' },
      { key: 'metric', header: 'Operational Metric' },
      { key: 'value', header: 'Metric Value' },
      { key: 'status', header: 'Health Status' },
      { key: 'notes', header: 'Assessment & Notes' },
    ];

    const summary = {
      totalSensors,
      activeSensors,
      totalCustomers,
      expiringSoon,
      expired,
      deploymentRate,
    };

    return { columns, summary, data };
  }

  // --- Export Generators ---

  private generateCsvString(report: Report): string {
    const headers = report.columns.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',');
    const rows = report.data.map((row) =>
      report.columns.map((c) => {
        const val = row[c.key];
        if (val === undefined || val === null) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    );

    return [headers, ...rows].join('\r\n');
  }

  private async generateExcelBuffer(report: Report): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CareSignal Platform';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Report Data');

    // Title Row
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = report.title;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF17272D' } };
    titleCell.alignment = { vertical: 'middle' };
    sheet.getRow(1).height = 30;

    // Metadata Row
    sheet.mergeCells('A2:G2');
    const metaCell = sheet.getCell('A2');
    metaCell.value = `Generated: ${new Date().toLocaleString('en-US')} | Author: ${report.generatedBy} | Type: ${report.type} | Scope: ${report.dateRange}`;
    metaCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF718087' } };
    sheet.getRow(2).height = 20;

    // Blank row
    sheet.addRow([]);

    // Summary KPIs
    if (report.summary && Object.keys(report.summary).length > 0) {
      sheet.addRow(['Summary Metrics:']);
      sheet.getRow(4).font = { bold: true, size: 11, color: { argb: 'FF1B8B83' } };

      const summaryKeys = Object.keys(report.summary);
      const summaryLabels = summaryKeys.map((k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()));
      const summaryVals = summaryKeys.map((k) => String(report.summary[k]));

      const sRow1 = sheet.addRow(summaryLabels);
      sRow1.font = { size: 9, bold: true, color: { argb: 'FF627276' } };
      const sRow2 = sheet.addRow(summaryVals);
      sRow2.font = { size: 12, bold: true, color: { argb: 'FF102B35' } };

      sheet.addRow([]);
    }

    // Table Header
    const headers = report.columns.map((c) => c.header);
    const headerRow = sheet.addRow(headers);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1B8B83' },
      };
      cell.font = {
        name: 'Arial',
        size: 10,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE4EBEB' } },
        bottom: { style: 'medium', color: { argb: 'FF102B35' } },
      };
    });

    // Data Rows
    report.data.forEach((row, idx) => {
      const rowValues = report.columns.map((col) => row[col.key] ?? '');
      const dataRow = sheet.addRow(rowValues);
      dataRow.height = 20;
      dataRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 9, color: { argb: 'FF334155' } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE4EBEB' } },
        };
        if (idx % 2 === 1) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFA' },
          };
        }
      });
    });

    // Auto fit column widths
    sheet.columns.forEach((column) => {
      let maxLen = 12;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const valStr = cell.value ? String(cell.value) : '';
        if (valStr.length > maxLen) maxLen = Math.min(valStr.length + 3, 40);
      });
      column.width = maxLen;
    });

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }

  private async generatePdfBuffer(report: Report): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header Brand
      doc.rect(40, 35, 6, 28).fill('#1b8b83');
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#102b35').text(report.title, 55, 35);
      doc.fontSize(9).font('Helvetica').fillColor('#718087').text(
        `CareSignal Health Platform | Generated on ${new Date().toLocaleString('en-US')} by ${report.generatedBy} | Type: ${report.type}`,
        55,
        55
      );

      doc.moveDown(2);

      // Summary KPIs Box
      if (report.summary && Object.keys(report.summary).length > 0) {
        const startY = 80;
        doc.roundedRect(40, startY, 762, 50, 6).fillAndStroke('#f6f8f7', '#e4ebeb');

        let xOffset = 55;
        const keys = Object.keys(report.summary);
        for (const k of keys.slice(0, 5)) {
          const label = k.replace(/([A-Z])/g, ' $1').toUpperCase();
          const val = String(report.summary[k]);

          doc.fontSize(8).font('Helvetica-Bold').fillColor('#709297').text(label, xOffset, startY + 10, { width: 140 });
          doc.fontSize(14).font('Helvetica-Bold').fillColor('#17272d').text(val, xOffset, startY + 24, { width: 140 });
          xOffset += 150;
        }

        doc.y = startY + 65;
      }

      // Table
      const tableTop = doc.y + 10;
      const numCols = report.columns.length;
      const colWidth = Math.floor(762 / numCols);

      // Header Row
      doc.rect(40, tableTop, 762, 22).fill('#1b8b83');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
      report.columns.forEach((col, idx) => {
        doc.text(col.header, 45 + idx * colWidth, tableTop + 6, { width: colWidth - 10, ellipsis: true });
      });

      let currentY = tableTop + 24;
      doc.font('Helvetica').fontSize(8);

      report.data.forEach((row, rowIdx) => {
        // Page break check
        if (currentY > 520) {
          doc.addPage({ margin: 40, size: 'A4', layout: 'landscape' });
          currentY = 45;

          // Header on new page
          doc.rect(40, currentY, 762, 20).fill('#1b8b83');
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
          report.columns.forEach((col, idx) => {
            doc.text(col.header, 45 + idx * colWidth, currentY + 5, { width: colWidth - 10, ellipsis: true });
          });
          currentY += 22;
          doc.font('Helvetica').fontSize(8);
        }

        if (rowIdx % 2 === 1) {
          doc.rect(40, currentY - 2, 762, 18).fill('#f9fafb');
        }

        doc.fillColor('#334155');
        report.columns.forEach((col, colIdx) => {
          const val = row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '—';
          doc.text(val, 45 + colIdx * colWidth, currentY + 2, { width: colWidth - 10, ellipsis: true });
        });

        // Bottom border
        doc.rect(40, currentY + 14, 762, 0.5).fill('#e5e7eb');
        currentY += 18;
      });

      // Footer
      doc.fontSize(8).font('Helvetica').fillColor('#9ca3af').text(
        `Confidential — For Internal Healthcare Operations Only. Generated by CareSignal Platform.`,
        40,
        560,
        { align: 'center', width: 762 }
      );

      doc.end();
    });
  }
}
