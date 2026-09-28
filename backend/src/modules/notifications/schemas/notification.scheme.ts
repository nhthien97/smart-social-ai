
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export enum NotificationType {
    WARNING = 'warning',
    FLAGGED = 'flagged',
    BLOCKED = 'blocked',
    POST_HIDDEN = 'post_hidden',
    POST_REMOVED = 'post_removed',
    REPORT_RESOLVED = 'report_resolved',
    GROUP_INVITE = 'group_invite',
    GROUP_JOIN = 'group_join',
    GROUP_ROLE = 'group_role',
    LIKE = 'like',
    COMMENT = 'comment',
    FRIEND_REQUEST = 'friend_request',
    FRIEND_ACCEPTED = 'friend_accepted',
    SYSTEM = 'system',
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Notification {
    @Prop({ required: true })
    user_id: string;

    @Prop()
    sender_id: string;

    @Prop({ required: true, enum: NotificationType })
    type: string;

    @Prop({ required: true })
    content: string;

    @Prop()
    ref_id: string;

    @Prop()
    ref_type: string;

    @Prop({ default: false })
    is_read: boolean;

    created_at: Date;
    updated_at: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);