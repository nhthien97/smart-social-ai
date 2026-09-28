import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

export class CreateReportDto {
    @IsString()
    reporter_id: string;

    @IsOptional()
    @IsString()
    reported_id?: string;

    @IsOptional()
    @IsString()
    reported_post_id?: string;

    @IsOptional()
    @IsString()
    group_id?: string;

    @IsString()
    type: string; // 'post', 'user', 'comment'

    @IsString()
    reason: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    evidence_urls?: string[];
}

export class ResolveReportDto {
    @IsString()
    resolved_note: string;

    @IsOptional()
    @IsString()
    action_taken?: string; // 'remove_post', 'ban_user', 'warn_user', 'none'
}
