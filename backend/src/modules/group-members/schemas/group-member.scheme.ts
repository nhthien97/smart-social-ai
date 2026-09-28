
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GroupMemberDocument = HydratedDocument<GroupMember>;

@Schema()
export class GroupMember {
    @Prop()
    group_id: string;

    @Prop()
    user_id: string;

    @Prop()
    role: string;

    @Prop()
    status: string;

    @Prop()
    approved_by: string;

    @Prop()
    approved_at: Date;

    @Prop()
    joined_at: Date;

    @Prop()
    left_at: Date;

    @Prop()
    invited_by: string;

    @Prop()
    rejected_by: string;
}

export const GroupMemberSchema = SchemaFactory.createForClass(GroupMember);