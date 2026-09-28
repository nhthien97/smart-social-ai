import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
    @IsString()
    user_id!: string;

    @IsString()
    post_id!: string;

    @IsOptional()
    @IsString()
    parent_id?: string;

    @IsString()
    @MinLength(1)
    @MaxLength(1000)
    content!: string;
}
