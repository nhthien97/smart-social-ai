import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SystemLogsDocument = SystemLogs & Document;

@Schema({ timestamps: true, collection: 'system_logs' })
export class SystemLogs {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user_id: Types.ObjectId;

  @Prop({ required: true, maxlength: 100 })
  action: string;

  @Prop({ maxlength: 50 })
  entity_type: string;

  @Prop()
  entity_id: string;

  @Prop({ maxlength: 45 })
  ip_address: string;

  @Prop({ maxlength: 500 })
  user_agent: string;

  @Prop({ type: Object })
  details: Record<string, any>;

  @Prop({ default: Date.now })
  created_at: Date;
}

export const SystemLogsSchema = SchemaFactory.createForClass(SystemLogs);

// Indexes for fast queries
SystemLogsSchema.index({ user_id: 1 });
SystemLogsSchema.index({ action: 1 });
SystemLogsSchema.index({ created_at: -1 });
SystemLogsSchema.index({ entity_type: 1, entity_id: 1 });
