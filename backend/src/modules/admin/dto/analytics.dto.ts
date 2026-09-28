import { IsOptional, IsDateString, IsNumber, Min, Max, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum AnalyticsPeriod {
    DAY = 'day',
    WEEK = 'week',
    MONTH = 'month',
}

export class QueryAnalyticsDto {
    @IsOptional()
    @IsDateString()
    from?: string; // ISO date

    @IsOptional()
    @IsDateString()
    to?: string;

    @IsOptional()
    @IsEnum(AnalyticsPeriod)
    period?: AnalyticsPeriod = AnalyticsPeriod.DAY; // group by day/week/month
}

export class QueryDailyStatsDto {
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
    limit?: number = 30;
}

export class QueryMonthlyStatsDto {
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    year?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(12)
    month?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number = 12;
}
