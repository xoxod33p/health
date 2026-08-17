import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Customer, CustomerDocument } from './customer.schema';
import { Sensor, SensorDocument } from '../sensors/sensor.schema';
import { CreateCustomerDto, CustomerQueryDto, UpdateCustomerDto } from './customer.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AuditService } from '../audit/audit.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private readonly customers: Model<CustomerDocument>,
    @InjectModel(Sensor.name) private readonly sensors: Model<SensorDocument>,
    private readonly realtime: RealtimeGateway,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateCustomerDto): Promise<Customer> {
    const count = await this.customers.countDocuments({ companyId: user.companyId }).exec();
    const customerNumber = `CUS-${String(count + 1).padStart(5, '0')}`;
    const customer = await this.customers.create({ ...dto, customerNumber, dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined, companyId: user.companyId, createdBy: user.authUserId, updatedBy: user.authUserId });
    this.realtime.broadcastCompany(user.companyId, 'customer.changed', { action: 'created', customerId: customer._id.toString() });
    await this.redis.delPattern(`dashboard:summary:${user.companyId}:*`);
    await this.audit.record(user, 'customer.create', 'Customer', customer._id.toString(), {
      customerNumber,
      name: `${customer.firstName} ${customer.lastName}`,
      phone: customer.phone,
      email: customer.email,
    }).catch(() => null);
    return customer;
  }

  async findAll(user: AuthenticatedUser, query: CustomerQueryDto): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const filter: FilterQuery<CustomerDocument> = { companyId: user.companyId };
    if (query.status) filter.status = query.status;
    if (query.search) {
      const search = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matchingSensors = await this.sensors
        .find({
          companyId: user.companyId,
          serialNumber: new RegExp(search, 'i'),
          customerId: { $exists: true },
        })
        .select('customerId')
        .lean()
        .exec();
      const customerIdsFromSensors = matchingSensors
        .map((s) => s.customerId)
        .filter((id): id is Types.ObjectId => !!id);

      filter.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { customerNumber: new RegExp(search, 'i') },
        ...(customerIdsFromSensors.length > 0 ? [{ _id: { $in: customerIdsFromSensors } }] : []),
      ];
    }
    const [rawCustomers, total] = await Promise.all([
      this.customers.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
      this.customers.countDocuments(filter).exec(),
    ]);

    const customerIds = rawCustomers.map((c) => c._id);
    const activeSensors = customerIds.length > 0
      ? await this.sensors
          .find({
            companyId: user.companyId,
            customerId: { $in: customerIds },
            status: { $nin: ['DISABLED', 'REPLACED'] },
          })
          .sort({ activatedAt: -1, createdAt: -1 })
          .lean()
          .exec()
      : [];

    const sensorMap = new Map<string, string[]>();
    activeSensors.forEach((s) => {
      if (s.customerId) {
        const key = s.customerId.toString();
        const list = sensorMap.get(key) || [];
        list.push(s.serialNumber);
        sensorMap.set(key, list);
      }
    });

    const data = rawCustomers.map((c) => {
      const attachedSerials = sensorMap.get(c._id.toString()) || [];
      return {
        ...c,
        attachedSensorSerial: attachedSerials[0] || undefined,
        attachedSensorSerials: attachedSerials,
      };
    });

    return { data, total, page, limit };
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<Customer> {
    const customer = await this.customers.findOne({ _id: id, companyId: user.companyId }).lean().exec();
    if (!customer) throw new NotFoundException('Customer not found');
    this.realtime.broadcastCompany(user.companyId, 'customer.changed', { action: 'updated', customerId: id });
    return customer;
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.customers.findOneAndUpdate({ _id: id, companyId: user.companyId }, { ...dto, dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined, updatedBy: user.authUserId }, { new: true }).lean().exec();
    if (!customer) throw new NotFoundException('Customer not found');
    this.realtime.broadcastCompany(user.companyId, 'customer.changed', { action: 'updated', customerId: id });
    await this.redis.delPattern(`dashboard:summary:${user.companyId}:*`);
    await this.audit.record(user, 'customer.update', 'Customer', id, {
      customerNumber: customer.customerNumber,
      name: `${customer.firstName} ${customer.lastName}`,
      ...dto,
    }).catch(() => null);
    return customer;
  }
}
