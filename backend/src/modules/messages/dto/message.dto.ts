import { IsString, IsOptional, IsArray, IsEnum, IsNumber, Max } from 'class-validator';
import { MessageType } from '../schemas/messages.scheme';

export class SendMessageDto {
    @IsString()
    conv_id: string;

    @IsOptional()
    @IsString()
    sender_id: string;

    @IsOptional()
    @IsString()
    content?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    media_urls?: string[];

    @IsOptional()
    @IsString()
    file_url?: string;

    @IsOptional()
    @IsString()
    file_name?: string;

    @IsOptional()
    @IsNumber()
    @Max(10 * 1024 * 1024) // max 10MB
    file_size?: number;

    @IsOptional()
    @IsEnum(MessageType)
    message_type?: MessageType;

    // Trả lời tin nhắn chỉ định
    @IsOptional()
    @IsString()
    reply_to_id?: string;
}

export class SharePostDto {
    @IsString()
    conv_id: string;

    @IsOptional()
    @IsString()
    sender_id: string;

    @IsString()
    post_id: string;

    @IsOptional()
    @IsString()
    content?: string; // Nội dung kèm theo khi chia sẻ
}

export class EditMessageDto {
    @IsString()
    content: string;
}
