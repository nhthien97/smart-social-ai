
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GroupDocument = HydratedDocument<Group>;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Group {
    @Prop({ required: true })
    creator_id: string;

    @Prop({ required: true })
    name: string;

    @Prop()
    description: string;

    @Prop()
    avatar_url: string;

    @Prop()
    cover_url: string;

    @Prop({ default: 0 })
    members_count: number;

    @Prop({ default: 0 })
    pending_posts: number;

    @Prop({ default: 0 })
    pending_members: number;

    @Prop({ default: false })
    require_post_approval: boolean;

    @Prop({ default: true })
    require_member_approval: boolean;

    @Prop({ type: String, enum: ['active', 'blocked'], default: 'active' })
    status: 'active' | 'blocked';

    created_at: Date;
    updated_at: Date;
}

export const GroupSchema = SchemaFactory.createForClass(Group);