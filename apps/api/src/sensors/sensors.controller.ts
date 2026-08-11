import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { AssignSensorDto, CreateSensorDto, SensorQueryDto } from './sensor.dto';
import { SensorsService } from './sensors.service';

@Controller('sensors')
@UseGuards(SupabaseAuthGuard)
export class SensorsController {
  constructor(private readonly sensors: SensorsService) {}

  @Post() create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSensorDto) { return this.sensors.create(user, dto); }
  @Get() findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: SensorQueryDto) { return this.sensors.findAll(user, query); }
  @Post(':id/assign') assign(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AssignSensorDto) { return this.sensors.assign(user, id, dto); }
  @Get(':id/history') history(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) { return this.sensors.history(user, id); }
}
