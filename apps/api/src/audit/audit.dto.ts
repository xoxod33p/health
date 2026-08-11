import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AuditQueryDto {
  @IsOptional() @IsString() @MaxLength(80) action?: string;
  @IsOptional() @IsString() @MaxLength(80) entityType?: string;
  @IsOptional() @IsString() @MaxLength(80) actorUserId?: string;
}
