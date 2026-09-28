import { IsString, IsOptional, IsBoolean, IsEnum, MaxLength } from 'class-validator';
import { DataType } from '../schemas/system-settings.schema';

export class CreateSystemSettingDto {
    @IsString()
    @MaxLength(100)
    setting_key: string;

    @IsString()
    setting_value: string;

    @IsOptional()
    @IsEnum(DataType)
    data_type?: DataType = DataType.STRING;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @IsOptional()
    @IsBoolean()
    is_public?: boolean = false;
}

export class UpdateSystemSettingDto {
    @IsOptional()
    @IsString()
    setting_value?: string;

    @IsOptional()
    @IsEnum(DataType)
    data_type?: DataType;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @IsOptional()
    @IsBoolean()
    is_public?: boolean;
}
