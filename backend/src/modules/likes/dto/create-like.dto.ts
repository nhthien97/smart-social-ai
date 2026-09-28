import { IsString, IsOptional } from 'class-validator';

export class CreateLikeDto {
    @IsString()
    user_id: string;

    @IsOptional()
    @IsString()
    post_id?: string;

    @IsOptional()
    @IsString()
    comment_id?: string;
}
