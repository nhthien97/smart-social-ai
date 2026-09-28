import { IsString, IsOptional, IsArray, IsEnum, ArrayMinSize } from 'class-validator';

export class CreatePrivateConversationDto {
    @IsOptional()
    @IsString()
    creator_id?: string;

    @IsString()
    friend_id: string; // Chỉ chat 1-1 với bạn bè
}

export class CreateGroupConversationDto {
    @IsOptional()
    @IsString()
    creator_id?: string;

    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    avatar_url?: string;

    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    participant_ids: string[]; // Danh sách user_id thêm vào nhóm
}

export class UpdateConversationDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    avatar_url?: string;
}
