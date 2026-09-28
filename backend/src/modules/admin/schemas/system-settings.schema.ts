import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SystemSettingsDocument = SystemSettings & Document;

export enum DataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json',
}

@Schema({ timestamps: true, collection: 'system_settings' })
export class SystemSettings {
  @Prop({ required: true, unique: true, maxlength: 100 })
  setting_key: string;

  @Prop({ type: String })
  setting_value: string;

  @Prop({ enum: DataType, default: DataType.STRING })
  data_type: DataType;

  @Prop({ maxlength: 500 })
  description: string;

  @Prop({ default: false })
  is_public: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updated_by: Types.ObjectId;
}

export const SystemSettingsSchema = SchemaFactory.createForClass(SystemSettings);

// Index for fast key lookup
// SystemSettingsSchema.index({ setting_key: 1 });
SystemSettingsSchema.index({ is_public: 1 });
