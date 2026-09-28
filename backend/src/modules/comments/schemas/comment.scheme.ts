
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CommentDocument = HydratedDocument<Comment>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Comment {
    @Prop()
    user_id: string;

    @Prop()
    post_id: string;

    @Prop()
    parent_id: string;

    @Prop()
    content: string;

    @Prop({ default: 0 })
    likes_count: number;

    created_at: Date;
    updated_at: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);