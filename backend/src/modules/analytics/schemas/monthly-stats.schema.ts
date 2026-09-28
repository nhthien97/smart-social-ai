import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MonthlyStatsDocument = MonthlyStats & Document;

@Schema({ timestamps: true, collection: 'monthly_stats' })
export class MonthlyStats {
  @Prop({ required: true })
  stat_year: number;

  @Prop({ required: true, min: 1, max: 12 })
  stat_month: number;

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

export const MonthlyStatsSchema = SchemaFactory.createForClass(MonthlyStats);

// Unique compound index for year + month
MonthlyStatsSchema.index({ stat_year: 1, stat_month: 1 }, { unique: true });
