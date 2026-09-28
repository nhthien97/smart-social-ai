import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export enum UpdatePostVisibility {
    PUBLIC = 'public',
    FRIENDS = 'friends',
    PRIVATE = 'private',
}

export class UpdatePostDto {
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
    @IsEnum(UpdatePostVisibility)
    visibility?: UpdatePostVisibility;
}
