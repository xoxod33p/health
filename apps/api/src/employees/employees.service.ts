import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateEmployeeDto, UpdateEmployeeDto } from './employee.dto';
import { Employee, EmployeeDocument } from './employee.schema';

@Injectable()
export class EmployeesService {
  private readonly defaultAdminEmail: string;

  constructor(
    @InjectModel(Employee.name) private readonly employees: Model<EmployeeDocument>,
    private readonly config: ConfigService,
  ) {
    this.defaultAdminEmail = (
      this.config.get<string>('DEFAULT_ADMIN_EMAIL') ||
      process.env.DEFAULT_ADMIN_EMAIL ||
      'admin@localhost.test'
    )
      .toLowerCase()
      .trim();
  }

  async create(user: AuthenticatedUser, dto: CreateEmployeeDto): Promise<Employee> {
    return this.employees.create({ ...dto, companyId: user.companyId });
  }

  async findAll(user: AuthenticatedUser): Promise<Array<Employee & { isProtected: boolean }>> {
    const list = await this.employees
      .find({ companyId: user.companyId })
      .sort({ lastName: 1, firstName: 1 })
      .lean()
      .exec();

    return list.map((e) => ({
      ...e,
      isProtected: e.email.toLowerCase().trim() === this.defaultAdminEmail,
    }));
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Employee not found');
    }

    const existing = await this.employees.findOne({ _id: id, companyId: user.companyId }).exec();
    if (!existing) {
      throw new NotFoundException('Employee not found');
    }

    // Disallow editing or modifying the default bootstrap admin account
    if (existing.email.toLowerCase().trim() === this.defaultAdminEmail) {
      throw new ForbiddenException(
        'The default environment administrator account is protected and cannot be edited, modified, or suspended.'
      );
    }

    const employee = await this.employees
      .findOneAndUpdate({ _id: id, companyId: user.companyId }, dto, { new: true })
      .lean()
      .exec();

    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async delete(user: AuthenticatedUser, id: string): Promise<{ deleted: boolean }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Employee not found');
    }

    const existing = await this.employees.findOne({ _id: id, companyId: user.companyId }).exec();
    if (!existing) {
      throw new NotFoundException('Employee not found');
    }

    // Disallow deleting the default bootstrap admin account
    if (existing.email.toLowerCase().trim() === this.defaultAdminEmail) {
      throw new ForbiddenException(
        'The default environment administrator account is protected and cannot be deleted.'
      );
    }

    await this.employees.deleteOne({ _id: id, companyId: user.companyId }).exec();
    return { deleted: true };
  }
}
