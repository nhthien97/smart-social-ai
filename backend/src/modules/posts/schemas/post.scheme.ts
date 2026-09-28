
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PostDocument = HydratedDocument<Post>;

export enum PostVisibility {
    PUBLIC = 'public',
    FRIENDS = 'friends',
    PRIVATE = 'private',
}

export enum PostStatus {
    ACTIVE = 'active',
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    HIDDEN = 'hidden',
    DELETED = 'deleted',
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Post {
    @Prop()
    user_id: string;

    @Prop()
    content: string;

    @Prop([String])
    media_urls: string[];

    @Prop()
    content_type: string;

    @Prop({ type: String, enum: PostVisibility, default: PostVisibility.PUBLIC })
    visibility: PostVisibility;

    @Prop({ default: null })
    group_id: string;

    @Prop({ type: String, enum: PostStatus, default: PostStatus.ACTIVE })
    status: string;

    @Prop()
    approved_by: string;

    @Prop()
    approved_at: Date;

    @Prop()
    rejected_reason: string;

    @Prop({ default: 0 })
    likes_count: number;

    @Prop({ default: 0 })
    comments_count: number;

    @Prop({ default: 0 })
    shares_count: number;

    @Prop({ default: 0 })
    view_count: number;

    // Chủ đề bài viết – bắt buộc chọn 1-3 tag khi tạo bài
    // Lưu slug của category, VD: ["technology", "gaming"]
    @Prop({ type: [String], default: [] })
    tags: string[];

    // Flag đánh dấu bài đã được chỉnh sửa bởi tác giả
    @Prop({ default: false })
    is_edited: boolean;

    created_at: Date;
    updated_at: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);