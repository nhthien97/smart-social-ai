import { IsString, IsOptional, IsArray, IsEnum, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export enum CreatePostVisibility {
    PUBLIC = 'public',
    FRIENDS = 'friends',
    PRIVATE = 'private',
}

export class CreatePostDto {
    @IsString()
    user_id: string;

    @IsOptional()
    @IsString()
    content?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    media_urls?: string[];

    @IsOptional()
    @IsString()
    content_type?: string;

    @IsOptional()
    @IsEnum(CreatePostVisibility)
    visibility?: CreatePostVisibility;

    @IsOptional()
    @IsString()
    group_id?: string;

    // Chủ đề bài viết – bắt buộc 1-3 tag (slug), VD: ["technology", "gaming"]
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(3)
    @IsString({ each: true })
    tags: string[];
}
