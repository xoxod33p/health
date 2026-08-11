import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class NotificationQueryDto {
  @IsOptional() @IsEnum(['UNREAD', 'READ']) status?: string;
  @IsOptional() @IsString() @MaxLength(100) type?: string;
}
