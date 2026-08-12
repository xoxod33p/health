import { IsDateString, IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString() @MinLength(1) @MaxLength(100) firstName!: string;
  @IsString() @MinLength(1) @MaxLength(100) lastName!: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() @MaxLength(40) gender?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(500) emergencyContact?: string;
  @IsOptional() @IsEnum(['ACTIVE', 'INACTIVE', 'ARCHIVED']) status?: string;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
}

export class UpdateCustomerDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) lastName?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsEnum(['ACTIVE', 'INACTIVE', 'ARCHIVED']) status?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(500) emergencyContact?: string;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
}

export class CustomerQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(['ACTIVE', 'INACTIVE', 'ARCHIVED']) status?: string;
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
}
