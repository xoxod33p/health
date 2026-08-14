import { IsEnum, IsIn, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReportDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsEnum(['SENSOR_INVENTORY', 'EXPIRATION_REPLACEMENT', 'CUSTOMER_COVERAGE', 'OPERATIONAL_SUMMARY'])
  type!: 'SENSOR_INVENTORY' | 'EXPIRATION_REPLACEMENT' | 'CUSTOMER_COVERAGE' | 'OPERATIONAL_SUMMARY';

  @IsOptional()
  @IsEnum(['7_DAYS', '30_DAYS', '90_DAYS', 'ALL_TIME'])
  dateRange?: '7_DAYS' | '30_DAYS' | '90_DAYS' | 'ALL_TIME';

  @IsOptional()
  @IsString()
  statusFilter?: string;

  @IsOptional()
  @IsString()
  sensorTypeId?: string;
}

export class ReportQueryDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}

export class ExportReportQueryDto {
  @IsOptional()
  @IsIn(['csv', 'excel', 'pdf', 'xlsx'])
  format?: 'csv' | 'excel' | 'pdf' | 'xlsx';
}
