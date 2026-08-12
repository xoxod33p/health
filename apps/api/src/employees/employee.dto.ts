import { IsArray, IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEmployeeDto {
  @IsString() @MinLength(1) @MaxLength(100) firstName!: string;
  @IsString() @MinLength(1) @MaxLength(100) lastName!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(1) authUserId!: string;
  @IsEnum(['SYSTEM_ADMIN', 'MANAGER', 'INHOUSE_STAFF', 'OUT_EMPLOYEE']) role!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) permissions?: string[];
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(100) title?: string;
}

export class UpdateEmployeeDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) lastName?: string;
  @IsOptional() @IsEnum(['SYSTEM_ADMIN', 'MANAGER', 'INHOUSE_STAFF', 'OUT_EMPLOYEE']) role?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) permissions?: string[];
  @IsOptional() @IsEnum(['ACTIVE', 'INVITED', 'SUSPENDED']) status?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(100) title?: string;
}
