import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/permissions';
import { MongoJwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssignSensorDto, CreateSensorDto, SensorQueryDto } from './sensor.dto';
import { SensorsService } from './sensors.service';

@Controller('sensors')
@UseGuards(MongoJwtAuthGuard, PermissionGuard)
@RequirePermissions('sensor.view')
export class SensorsController {
  constructor(private readonly sensors: SensorsService) {}

  @Post() @RequirePermissions('sensor.create') create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSensorDto) { return this.sensors.create(user, dto); }
  @Get() findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: SensorQueryDto) { return this.sensors.findAll(user, query); }
  @Post(':id/assign') @RequirePermissions('sensor.assign') assign(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignSensorDto) { return this.sensors.assign(user, id, dto); }
  @Get(':id/history') history(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.sensors.history(user, id); }
}
