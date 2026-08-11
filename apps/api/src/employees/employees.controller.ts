import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/permissions';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CreateEmployeeDto, UpdateEmployeeDto } from './employee.dto';
import { EmployeesService } from './employees.service';

@Controller('employees')
@UseGuards(SupabaseAuthGuard, PermissionGuard)
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get() @RequirePermissions('employee.view') findAll(@CurrentUser() user: AuthenticatedUser) { return this.employees.findAll(user); }
  @Post() @RequirePermissions('employee.create') create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEmployeeDto) { return this.employees.create(user, dto); }
  @Patch(':id') @RequirePermissions('employee.update') update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) { return this.employees.update(user, id, dto); }
}
