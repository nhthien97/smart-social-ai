import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GroupMemberDocument = HydratedDocument<GroupMember>;

export enum GroupMemberRole {
  MEMBER = 'MEMBER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

export enum GroupMemberStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  BLOCKED = 'BLOCKED',
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class GroupMember {
    @Prop({ required: true })
    group_id: string;

    @Prop({ required: true })
    user_id: string;

    @Prop({ type: String, enum: GroupMemberRole, default: GroupMemberRole.MEMBER })
    role: GroupMemberRole;

    @Prop({ type: String, enum: GroupMemberStatus, default: GroupMemberStatus.ACTIVE })
    status: GroupMemberStatus;

    @Prop()
    invited_by: string;

    @Prop()
    joined_at: Date;

    created_at: Date;
    updated_at: Date;
}

export const GroupMemberSchema = SchemaFactory.createForClass(GroupMember);