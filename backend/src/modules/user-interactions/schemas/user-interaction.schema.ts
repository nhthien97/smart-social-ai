import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserInteractionDocument = HydratedDocument<UserInteraction>;

export enum InteractionType {
    VIEW    = 'view',
    LIKE    = 'like',
    COMMENT = 'comment',
    SHARE   = 'share',
    SAVE    = 'save',
    REPORT  = 'report',   // Báo cáo bài viết → trọng số âm, giảm đề xuất
}

// Weight dùng trong User-Item Matrix khi tính Cosine Similarity
// REPORT có trọng số âm → cosine similarity giảm → ít đề xuất bài tương tự
export const INTERACTION_WEIGHT: Record<InteractionType, number> = {
    [InteractionType.VIEW]:    1,
    [InteractionType.LIKE]:    2,
    [InteractionType.COMMENT]: 3,
    [InteractionType.SHARE]:   4,
    [InteractionType.SAVE]:    3,
    [InteractionType.REPORT]: -5,
};

@Schema({ collection: 'user_interactions', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class UserInteraction {
    @Prop({ required: true })
    user_id: string;

    @Prop({ required: true })
    post_id: string;

    @Prop({ type: String, enum: InteractionType, required: true })
    interaction_type: InteractionType;

    @Prop({ required: true })
    weight: number; // Lưu sẵn weight để Python query nhanh hơn

    @Prop({ type: Number, default: null })
    duration_ms: number; // Thời gian đọc bài (ms), chỉ dùng với type=view

    created_at: Date;
    updated_at: Date;
}

export const UserInteractionSchema = SchemaFactory.createForClass(UserInteraction);

// Compound index: mỗi cặp (user, post, type) chỉ có 1 record
UserInteractionSchema.index(
    { user_id: 1, post_id: 1, interaction_type: 1 },
    { unique: true },
);
UserInteractionSchema.index({ post_id: 1 });
UserInteractionSchema.index({ created_at: -1 });
