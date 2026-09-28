import { IsOptional, IsString, IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySystemLogsDto {
    @IsOptional()
    @IsString()
    search?: string; // tìm theo action, entity_type, entity_id

    @IsOptional()
    @IsString()
    action?: string; // filter by action (e.g. 'block_user', 'delete_post')

    @IsOptional()
    @IsString()
    entity_type?: string; // filter by entity_type (e.g. 'user', 'post', 'setting')

    @IsOptional()
    @IsString()
    user_id?: string; // filter by admin user

    @IsOptional()
    @IsDateString()
    from?: string; // ISO date string

    @IsOptional()
    @IsDateString()
    to?: string; // ISO date string

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number = 20;
}
