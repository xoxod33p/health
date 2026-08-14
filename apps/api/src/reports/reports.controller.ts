import { Body, Controller, Delete, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { MongoJwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/permissions';
import { CreateReportDto, ExportReportQueryDto, ReportQueryDto } from './report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(MongoJwtAuthGuard, PermissionGuard)
@RequirePermissions('report.view')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  async generate(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReportDto) {
    return this.reportsService.create(user, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ReportQueryDto) {
    return this.reportsService.findAll(user, query);
  }

  @Get('stats')
  async stats(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.stats(user);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.reportsService.findOne(user, id);
  }

  @Get(':id/export')
  @RequirePermissions('report.export')
  async export(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ExportReportQueryDto,
    @Res() res: Response
  ) {
    const result = await this.reportsService.exportReport(user, id, query.format ?? 'csv');
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.end(result.buffer);
  }

  @Delete(':id')
  @RequirePermissions('report.export')
  async delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.reportsService.delete(user, id);
  }
}
