import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DailyStatsDocument = DailyStats & Document;

@Schema({ timestamps: true, collection: 'daily_stats' })
export class DailyStats {
  @Prop({ required: true, unique: true, type: Date })
  stat_date: Date;

  // User metrics
  @Prop({ default: 0 })
  total_users: number;

  @Prop({ default: 0 })
  new_users: number;

  @Prop({ default: 0 })
  active_users: number;

  // Post metrics
  @Prop({ default: 0 })
  total_posts: number;

  @Prop({ default: 0 })
  new_posts: number;

  @Prop({ default: 0 })
  posts_text: number;

  @Prop({ default: 0 })
  posts_image: number;

  @Prop({ default: 0 })
  posts_file: number;

  @Prop({ default: 0 })
  posts_link: number;

  // Engagement metrics
  @Prop({ default: 0 })
  total_likes: number;

  @Prop({ default: 0 })
  total_comments: number;

  @Prop({ default: 0 })
  total_shares: number;

  // Message metrics
  @Prop({ default: 0 })
  total_messages: number;

  @Prop({ default: 0 })
  messages_text: number;

  @Prop({ default: 0 })
  messages_image: number;

  @Prop({ default: 0 })
  messages_file: number;

  @Prop({ default: 0 })
  messages_link: number;

  // Group metrics
  @Prop({ default: 0 })
  total_groups: number;

  @Prop({ default: 0 })
  new_groups: number;
}

export const DailyStatsSchema = SchemaFactory.createForClass(DailyStats);

// Index for fast date queries
// DailyStatsSchema.index({ stat_date: 1 });
