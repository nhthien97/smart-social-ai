import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

  @IsOptional()
  @IsString()
  cover_url?: string;

  @IsOptional()
  @IsBoolean()
  require_post_approval?: boolean;

  @IsOptional()
  @IsBoolean()
  require_member_approval?: boolean;
}
