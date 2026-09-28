
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LikeDocument = HydratedDocument<Like>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Like {
    @Prop()
    user_id!: string;

    @Prop()
    post_id!: string;

    @Prop()
    comment_id!: string;

    created_at!: Date;
}

export const LikeSchema = SchemaFactory.createForClass(Like);

LikeSchema.index(
    { user_id: 1, post_id: 1 },
    { unique: true, partialFilterExpression: { post_id: { $exists: true } } },
);

LikeSchema.index(
    { user_id: 1, comment_id: 1 },
    { unique: true, partialFilterExpression: { comment_id: { $exists: true } } },
);
