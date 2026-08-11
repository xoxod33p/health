import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Customer, CustomerDocument } from '../customers/customer.schema';
import { AssignSensorDto, CreateSensorDto, SensorQueryDto } from './sensor.dto';
import { Sensor, SensorDocument } from './sensor.schema';
import { SensorAssignment, SensorAssignmentDocument } from './sensor-assignment.schema';

@Injectable()
export class SensorsService {
  constructor(
    @InjectModel(Sensor.name) private readonly sensors: Model<SensorDocument>,
    @InjectModel(SensorAssignment.name) private readonly assignments: Model<SensorAssignmentDocument>,
    @InjectModel(Customer.name) private readonly customers: Model<CustomerDocument>,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateSensorDto): Promise<Sensor> {
    return this.sensors.create({ ...dto, expiresAt: new Date(dto.expiresAt), companyId: user.companyId });
  }

  async findAll(user: AuthenticatedUser, query: SensorQueryDto): Promise<{ data: Sensor[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const filter: FilterQuery<SensorDocument> = { companyId: user.companyId };
    if (query.status) filter.status = query.status;
    if (query.search) {
      const search = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ serialNumber: new RegExp(search, 'i') }, { manufacturer: new RegExp(search, 'i') }, { model: new RegExp(search, 'i') }];
    }
    const [data, total] = await Promise.all([this.sensors.find(filter).sort({ expiresAt: 1 }).skip((page - 1) * limit).limit(limit).lean().exec(), this.sensors.countDocuments(filter).exec()]);
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
    await this.assignments.updateMany({ companyId: user.companyId, sensorId: sensor._id, unassignedAt: { $exists: false } }, { unassignedAt: new Date() }).exec();
    await this.assignments.create({ companyId: user.companyId, sensorId: sensor._id, customerId: customer._id, assignedBy: user.authUserId, assignedAt: new Date(), reason: dto.reason });
    sensor.customerId = customer._id;
    sensor.status = 'ASSIGNED';
    return sensor.save();
  }

  async history(user: AuthenticatedUser, sensorId: string): Promise<SensorAssignment[]> {
    if (!Types.ObjectId.isValid(sensorId)) throw new BadRequestException('Invalid sensor id');
    return this.assignments.find({ companyId: user.companyId, sensorId }).sort({ assignedAt: -1 }).lean().exec();
  }
}
