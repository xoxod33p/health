import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Customer, CustomerDocument } from '../customers/customer.schema';
import { SensorType, SensorTypeDocument } from '../sensor-types/sensor-type.schema';
import { AssignSensorDto, CreateSensorDto, CreateSensorReplacementDto, SensorQueryDto } from './sensor.dto';
import { Sensor, SensorDocument } from './sensor.schema';
import { SensorAssignment, SensorAssignmentDocument } from './sensor-assignment.schema';
import { SensorReplacement, SensorReplacementDocument } from './sensor-replacement.schema';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class SensorsService {
  constructor(
    @InjectModel(Sensor.name) private readonly sensors: Model<SensorDocument>,
    @InjectModel(SensorAssignment.name) private readonly assignments: Model<SensorAssignmentDocument>,
    @InjectModel(SensorReplacement.name) private readonly replacements: Model<SensorReplacementDocument>,
    @InjectModel(Customer.name) private readonly customers: Model<CustomerDocument>,
    @InjectModel(SensorType.name) private readonly sensorTypes: Model<SensorTypeDocument>,
    private readonly realtime: RealtimeGateway,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateSensorDto): Promise<Sensor> {
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    const activatedAt = dto.installedAt || dto.activatedAt ? new Date(dto.installedAt || dto.activatedAt!) : undefined;
    const sensor = await this.sensors.create({
      ...dto,
      expiresAt,
      ...(activatedAt ? { activatedAt } : {}),
      companyId: user.companyId,
    });
    this.realtime.broadcastCompany(user.companyId, 'sensor.changed', { action: 'created', sensorId: sensor._id.toString() });
    return sensor;
  }

  async findAll(user: AuthenticatedUser, query: SensorQueryDto): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const filter: FilterQuery<SensorDocument> = { companyId: user.companyId };
    if (query.status) filter.status = query.status;
    if (query.search) {
      const search = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ serialNumber: new RegExp(search, 'i') }, { manufacturer: new RegExp(search, 'i') }, { model: new RegExp(search, 'i') }];
    }

    const [rawSensors, total] = await Promise.all([
      this.sensors.find(filter).sort({ expiresAt: 1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
      this.sensors.countDocuments(filter).exec(),
    ]);

    
    const customerIds = rawSensors
      .map((s) => s.customerId)
      .filter((id): id is Types.ObjectId => !!id && Types.ObjectId.isValid(id as any));

    const sensorTypeIds = Array.from(new Set(rawSensors.map((s) => s.sensorTypeId).filter(Boolean)));

    const validObjectIds = sensorTypeIds.filter((id) => Types.ObjectId.isValid(id));

    const [customerDocs, sensorTypeDocs] = await Promise.all([
      customerIds.length > 0
        ? this.customers.find({ _id: { $in: customerIds } }).lean().exec()
        : [],
      sensorTypeIds.length > 0
        ? this.sensorTypes.find({
            $or: [
              ...(validObjectIds.length > 0 ? [{ _id: { $in: validObjectIds } }] : []),
              { code: { $in: sensorTypeIds } },
            ],
          }).lean().exec()
        : [],
    ]);

    const customerMap = new Map<string, any>(customerDocs.map((c) => [c._id.toString(), c]));
    const sensorTypeMap = new Map<string, any>();
    sensorTypeDocs.forEach((st) => {
      sensorTypeMap.set(st._id.toString(), st);
      sensorTypeMap.set(st.code, st);
    });

    const data = rawSensors.map((s) => {
      const cust = s.customerId ? customerMap.get(s.customerId.toString()) : undefined;
      const st = sensorTypeMap.get(s.sensorTypeId);
      return {
        ...s,
        customerName: cust ? `${cust.firstName} ${cust.lastName}` : undefined,
        customerNumber: cust?.customerNumber,
        sensorTypeName: st?.name || s.sensorTypeId,
        sensorTypeCode: st?.code,
        installedAt: s.activatedAt,
      };
    });

    return { data, total, page, limit };
  }

  async assign(user: AuthenticatedUser, sensorId: string, dto: AssignSensorDto): Promise<Sensor> {
    if (!Types.ObjectId.isValid(sensorId) || !Types.ObjectId.isValid(dto.customerId)) throw new BadRequestException('Invalid sensor or customer id');
    const [sensor, customer] = await Promise.all([
      this.sensors.findOne({ _id: sensorId, companyId: user.companyId }).exec(),
      this.customers.findOne({ _id: dto.customerId, companyId: user.companyId }).exec(),
    ]);
    if (!sensor || !customer) throw new NotFoundException('Sensor or customer not found');
    if (sensor.status === 'DISABLED' || sensor.status === 'REPLACED') throw new BadRequestException('Sensor cannot be assigned');
    const installDate = dto.installedAt || dto.assignedAt ? new Date(dto.installedAt || dto.assignedAt!) : new Date();
    await this.assignments.updateMany({ companyId: user.companyId, sensorId: sensor._id, unassignedAt: { $exists: false } }, { unassignedAt: installDate }).exec();
    await this.assignments.create({
      companyId: user.companyId,
      sensorId: sensor._id,
      customerId: customer._id,
      assignedBy: user.authUserId,
      assignedAt: installDate,
      reason: dto.reason,
    });
    sensor.customerId = customer._id;
    sensor.status = 'ASSIGNED';
    sensor.activatedAt = installDate;
    const saved = await sensor.save();
    this.realtime.broadcastCompany(user.companyId, 'sensor.changed', { action: 'assigned', sensorId: sensorId, customerId: dto.customerId });
    return saved;
  }

  async history(user: AuthenticatedUser, sensorId: string): Promise<SensorAssignment[]> {
    if (!Types.ObjectId.isValid(sensorId)) throw new BadRequestException('Invalid sensor id');
    return this.assignments.find({ companyId: user.companyId, sensorId }).sort({ assignedAt: -1 }).lean().exec();
  }

  async logReplacement(user: AuthenticatedUser, dto: CreateSensorReplacementDto): Promise<SensorReplacement> {
    const record = await this.replacements.create({
      companyId: user.companyId,
      customerName: dto.customerName.trim(),
      serialNumber: dto.serialNumber.trim().toUpperCase(),
      replacedDate: new Date(dto.replacedDate),
      issueType: dto.issueType.trim(),
      notes: dto.notes?.trim(),
      replacedBy: user.authUserId,
    });
    this.realtime.broadcastCompany(user.companyId, 'sensor.changed', { action: 'replacement_logged', serialNumber: dto.serialNumber });
    return record;
  }

  async listReplacements(
    user: AuthenticatedUser,
    query: { search?: string; page?: number; limit?: number },
  ): Promise<{ data: SensorReplacement[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const filter: FilterQuery<SensorReplacementDocument> = { companyId: user.companyId };
    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { customerName: new RegExp(escaped, 'i') },
        { serialNumber: new RegExp(escaped, 'i') },
        { issueType: new RegExp(escaped, 'i') },
      ];
    }
    const [data, total] = await Promise.all([
      this.replacements.find(filter).sort({ replacedDate: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
      this.replacements.countDocuments(filter).exec(),
    ]);
    return { data, total, page, limit };
  }
}
