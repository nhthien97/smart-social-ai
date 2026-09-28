
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

export enum MessageType {
    TEXT = 'text',
    IMAGE = 'image',
    FILE = 'file',
    SYSTEM = 'system',       // "X đã thêm Y vào nhóm"
    SHARE_POST = 'share_post', // Chia sẻ bài viết
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Message {
    @Prop({ required: true })
    conv_id: string;

    @Prop({ required: true })
    sender_id: string;

    @Prop({ default: '' })
    content: string;

    // Ảnh (có thể gửi nhiều ảnh cùng lúc)
    @Prop({ type: [String], default: [] })
    media_urls: string[];

    // File đính kèm (1 file mỗi tin nhắn)
    @Prop()
    file_url: string;

    @Prop()
    file_name: string;

    @Prop({ type: Number, default: 0 })
    file_size: number; // bytes

    @Prop({ type: String, enum: MessageType, default: MessageType.TEXT })
    message_type: MessageType;

    // Trả lời tin nhắn chỉ định (giống Zalo/Messenger)
    @Prop({ default: null })
    reply_to_id: string;

    // Share bài viết
    @Prop({ default: null })
    shared_post_id: string;

    // Chỉnh sửa tin nhắn
    @Prop({ default: false })
    is_edited: boolean;

    @Prop({ type: Date, default: null })
    edited_at: Date;

    // Thu hồi tin nhắn
    @Prop({ default: false })
    is_recalled: boolean;

    @Prop({ type: Date, default: null })
    recalled_at: Date;

    // Soft delete
    @Prop({ default: false })
    is_deleted: boolean;

    created_at: Date;
    updated_at: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conv_id: 1, created_at: -1 });
MessageSchema.index({ sender_id: 1 });