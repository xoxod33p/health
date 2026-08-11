import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Employee, EmployeeSchema } from './employee.schema';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  imports: [AuthModule, MongooseModule.forFeature([{ name: Employee.name, schema: EmployeeSchema }])],
  controllers: [EmployeesController],
  providers: [EmployeesService],
})
export class EmployeesModule {}
