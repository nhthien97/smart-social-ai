
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConversationDocument = HydratedDocument<Conversation>;

export enum ConversationType {
    PRIVATE = 'private',   // Chat 1-1 giữa 2 người bạn
    GROUP = 'group',       // Nhóm chat
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Conversation {
    @Prop({ type: String, enum: ConversationType, required: true })
    type: ConversationType;

    // Tên nhóm (chỉ dùng cho group, private thì null)
    @Prop({ default: null })
    name: string;

    // Avatar nhóm
    @Prop({ default: null })
    avatar_url: string;

    // Người tạo nhóm / người bắt đầu cuộc trò chuyện
    @Prop({ required: true })
    creator_id: string;

    // Cache tin nhắn cuối để hiển thị trong danh sách chat
    @Prop({ default: null })
    last_message_id: string;

    @Prop({ default: '' })
    last_message_content: string;

    @Prop({ type: Date, default: null })
    last_message_at: Date;

    @Prop({ default: '' })
    last_message_sender_id: string;

    created_at: Date;
    updated_at: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index({ last_message_at: -1 });