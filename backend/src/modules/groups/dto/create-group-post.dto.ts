import { IsString, IsOptional, IsArray, MaxLength, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class CreateGroupPostDto {
  @IsString()
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media_urls?: string[];

  @IsOptional()
  @IsString()
  content_type?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @IsString({ each: true })
  tags?: string[];
}
