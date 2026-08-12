import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSensorTypeDto {
  @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @IsString() @MinLength(1) @MaxLength(40) code!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
}

export class UpdateSensorTypeDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(40) code?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsEnum(['ACTIVE', 'INACTIVE']) status?: string;
}
