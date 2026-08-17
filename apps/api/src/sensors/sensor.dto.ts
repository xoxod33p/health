import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSensorDto {
  @IsString() @MinLength(1) @MaxLength(100) serialNumber!: string;
  @IsOptional() @IsString() @MaxLength(100) sensorTypeId?: string;
  @IsOptional() @IsString() @MaxLength(100) manufacturer?: string;
  @IsOptional() @IsString() @MaxLength(100) model?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsDateString() installedAt?: string;
  @IsOptional() @IsDateString() activatedAt?: string;
}

export class SensorQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(['AVAILABLE', 'ASSIGNED', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'DISABLED', 'REPLACED']) status?: string;
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
}

export class AssignSensorDto {
  @IsString() customerId!: string;
  @IsOptional() @IsDateString() installedAt?: string;
  @IsOptional() @IsDateString() assignedAt?: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class CreateSensorReplacementDto {
  @IsString() @MinLength(1) @MaxLength(150) customerName!: string;
  @IsString() @MinLength(1) @MaxLength(100) serialNumber!: string;
  @IsString() @MinLength(1) replacedDate!: string;
  @IsString() @MinLength(1) @MaxLength(1000) issueType!: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
