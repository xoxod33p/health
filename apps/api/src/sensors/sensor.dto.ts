import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSensorDto {
  @IsString() @MinLength(1) @MaxLength(100) serialNumber!: string;
  @IsString() @MinLength(1) @MaxLength(100) sensorTypeId!: string;
  @IsString() @MinLength(1) @MaxLength(100) manufacturer!: string;
  @IsString() @MinLength(1) @MaxLength(100) model!: string;
  @IsDateString() expiresAt!: string;
}

export class SensorQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(['AVAILABLE', 'ASSIGNED', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'DISABLED', 'REPLACED']) status?: string;
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
}

export class AssignSensorDto {
  @IsString() customerId!: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
