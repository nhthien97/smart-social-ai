import { IsString, IsOptional, MaxLength } from 'class-validator';

export class RejectPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  rejected_reason?: string;
}
