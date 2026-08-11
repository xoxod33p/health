import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateEmployeeDto, UpdateEmployeeDto } from './employee.dto';
import { Employee, EmployeeDocument } from './employee.schema';

@Injectable()
export class EmployeesService {
  constructor(@InjectModel(Employee.name) private readonly employees: Model<EmployeeDocument>) {}

  async create(user: AuthenticatedUser, dto: CreateEmployeeDto): Promise<Employee> {
    return this.employees.create({ ...dto, companyId: user.companyId });
  }

  async findAll(user: AuthenticatedUser): Promise<Employee[]> {
    return this.employees.find({ companyId: user.companyId }).sort({ lastName: 1, firstName: 1 }).lean().exec();
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.employees.findOneAndUpdate({ _id: id, companyId: user.companyId }, dto, { new: true }).lean().exec();
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }
}
