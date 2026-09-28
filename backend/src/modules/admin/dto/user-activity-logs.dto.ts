import { IsOptional, IsString, IsDateString, IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ActivityType } from '../schemas/user-activity-log.schema';

export class QueryUserActivityLogsDto {
    @IsOptional()
    @IsString()
    search?: string; // tìm theo username, email

    @IsOptional()
    @IsString()
    user_id?: string; // filter by specific user

    @IsOptional()
    @IsEnum(ActivityType)
    activity_type?: ActivityType;

    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;

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
