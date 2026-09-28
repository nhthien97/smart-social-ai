import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserActivityLogDocument = UserActivityLog & Document;

export enum ActivityType {
  LOGIN = 'login',
  POST = 'post',
  LIKE = 'like',
  COMMENT = 'comment',
  MESSAGE = 'message',
  SHARE = 'share',
  CREATE_POST = 'create_post', 
  EDIT_POST = 'edit_post', 
  DELETE_POST = 'delete_post', 
  CREATE_GROUP = 'create_group', 
  EDIT_GROUP = 'edit_group', 
  DELETE_GROUP = 'delete_group', 
  REPORT_POST = 'report_post'
}

@Schema({ timestamps: true, collection: 'user_activity_log' })
export class UserActivityLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ required: true, type: Date })
  activity_date: Date;

  @Prop({ required: true, enum: ActivityType })
  activity_type: ActivityType;

  @Prop({ default: 1 })
  activity_count: number;
}

export const UserActivityLogSchema = SchemaFactory.createForClass(UserActivityLog);

// Compound unique index for user + date + type
UserActivityLogSchema.index(
  { user_id: 1, activity_date: 1, activity_type: 1 },
  { unique: true }
);

// Index for date queries
UserActivityLogSchema.index({ activity_date: 1 });
UserActivityLogSchema.index({ user_id: 1 });
