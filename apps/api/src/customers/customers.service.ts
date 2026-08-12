import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Customer, CustomerDocument } from './customer.schema';
import { CreateCustomerDto, CustomerQueryDto, UpdateCustomerDto } from './customer.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@Injectable()
export class CustomersService {
  constructor(@InjectModel(Customer.name) private readonly customers: Model<CustomerDocument>, private readonly realtime: RealtimeGateway) {}

  async create(user: AuthenticatedUser, dto: CreateCustomerDto): Promise<Customer> {
    const count = await this.customers.countDocuments({ companyId: user.companyId }).exec();
    const customerNumber = `CUS-${String(count + 1).padStart(5, '0')}`;
    const customer = await this.customers.create({ ...dto, customerNumber, dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined, companyId: user.companyId, createdBy: user.authUserId, updatedBy: user.authUserId });
    this.realtime.broadcastCompany(user.companyId, 'customer.changed', { action: 'created', customerId: customer._id.toString() });
    return customer;
  }

  async findAll(user: AuthenticatedUser, query: CustomerQueryDto): Promise<{ data: Customer[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const filter: FilterQuery<CustomerDocument> = { companyId: user.companyId };
    if (query.status) filter.status = query.status;
    if (query.search) {
      const search = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ firstName: new RegExp(search, 'i') }, { lastName: new RegExp(search, 'i') }, { customerNumber: new RegExp(search, 'i') }];
    }
    const [data, total] = await Promise.all([this.customers.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(), this.customers.countDocuments(filter).exec()]);
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
    return customer;
  }
}
