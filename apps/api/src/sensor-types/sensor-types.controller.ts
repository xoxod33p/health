import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { MongoJwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/permissions';
import { CreateSensorTypeDto, UpdateSensorTypeDto } from './sensor-type.dto';
import { SensorTypesService } from './sensor-types.service';

@Controller('sensor-types')
@UseGuards(MongoJwtAuthGuard, PermissionGuard)
@RequirePermissions('sensor.view')
export class SensorTypesController {
  constructor(private readonly sensorTypes: SensorTypesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.sensorTypes.findAll(user);
  }

  @Post()
  @RequirePermissions('sensor.create')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSensorTypeDto) {
    return this.sensorTypes.create(user, dto);
  }

  @Patch(':id')
  @RequirePermissions('sensor.update')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateSensorTypeDto) {
    return this.sensorTypes.update(user, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('sensor.create')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.sensorTypes.remove(user, id);
  }
}
