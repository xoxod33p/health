import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { MongoJwtAuthGuard } from '../auth/jwt-auth.guard';
import { SystemService } from './system.service';

@Controller('system')
@UseGuards(MongoJwtAuthGuard)
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('stats')
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.systemService.getStats(user);
  }

  @Post('clear-data')
  @HttpCode(HttpStatus.OK)
  async clearAllData(@CurrentUser() user: AuthenticatedUser) {
    return this.systemService.clearAllData(user);
  }
}
