import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '../auth/auth.types';
import { hashPassword } from '../auth/password.util';
import { User, UserDocument } from '../users/user.schema';
import { CreateEmployeeDto, UpdateEmployeeDto } from './employee.dto';
import { Employee, EmployeeDocument } from './employee.schema';

@Injectable()
export class EmployeesService {
  private readonly defaultAdminEmail: string;

  constructor(
    @InjectModel(Employee.name) private readonly employees: Model<EmployeeDocument>,
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
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
    const email = dto.email.toLowerCase().trim();
    const status = dto.status ?? 'ACTIVE';
    const rawPassword = dto.password || 'ChangeMe123!';
    const { passwordHash, salt } = hashPassword(rawPassword);

    
    const existingUser = await this.users.findOne({ email }).exec();
    if (!existingUser) {
      await this.users.create({
        authUserId: dto.authUserId,
        email,
        companyId: user.companyId,
        role: dto.role,
        permissions: dto.permissions || [],
        status: 'ACTIVE',
        passwordHash,
        salt,
      });
    } else {
      existingUser.status = 'ACTIVE';
      existingUser.role = dto.role;
      existingUser.permissions = dto.permissions || [];
      await existingUser.save();
    }

    
    return this.employees.create({
      ...dto,
      email,
      status,
      companyId: user.companyId,
    });
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

    
    if (dto.status || dto.role || dto.permissions) {
      await this.users.updateOne(
        { email: existing.email.toLowerCase().trim() },
        {
          ...(dto.status ? { status: dto.status } : {}),
          ...(dto.role ? { role: dto.role } : {}),
          ...(dto.permissions ? { permissions: dto.permissions } : {}),
        }
      ).exec();
    }

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

    
    if (existing.email.toLowerCase().trim() === this.defaultAdminEmail) {
      throw new ForbiddenException(
        'The default environment administrator account is protected and cannot be deleted.'
      );
    }

    await Promise.all([
      this.employees.deleteOne({ _id: id, companyId: user.companyId }).exec(),
      this.users.deleteOne({ email: existing.email.toLowerCase().trim() }).exec(),
    ]);

    return { deleted: true };
  }
}
