
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ConversationParticipantDocument = HydratedDocument<ConversationParticipant>;

export enum ParticipantRole {
    LEADER = 'leader',     // Nhóm trưởng (chỉ 1 người, quyền cao nhất)
    ADMIN = 'admin',       // Quản trị viên (nhiều người)
    MEMBER = 'member',     // Thành viên thường
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class ConversationParticipant {
    @Prop({ required: true })
    conv_id: string;

    @Prop({ required: true })
    user_id: string;

    @Prop({ type: String, enum: ParticipantRole, default: ParticipantRole.MEMBER })
    role: ParticipantRole;

    // Biệt danh trong nhóm
    @Prop({ default: null })
    nickname: string;

    @Prop({ type: Date, default: Date.now })
    joined_at: Date;

    // null = vẫn trong nhóm, có giá trị = đã rời
    @Prop({ type: Date, default: null })
    left_at: Date;

    // Last read marker – để tính số tin chưa đọc
    @Prop({ type: Date, default: null })
    last_read_at: Date;

    // Tắt thông báo cho conversation này
    @Prop({ default: false })
    is_muted: boolean;

    // Người đã chặn participant này (UC4.12: block trong chat riêng)
    // null = không bị chặn; có giá trị = user_id của người đã chặn
    @Prop({ type: String, default: null })
    blocked_by: string;

    // Timestamp khi user xóa lịch sử chat (UC: clear history)
    // Khi fetch messages, chỉ lấy messages sau thời điểm này
    @Prop({ type: Date, default: null })
    history_cleared_at: Date;

    created_at: Date;
    updated_at: Date;
}

export const ConversationParticipantSchema = SchemaFactory.createForClass(ConversationParticipant);

ConversationParticipantSchema.index({ conv_id: 1, user_id: 1 }, { unique: true });
ConversationParticipantSchema.index({ user_id: 1, left_at: 1 });