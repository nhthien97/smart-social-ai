
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserRoleAdmin {
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  VIEWER = 'VIEWER',
  NONE = 'NONE',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  FLAGGED = 'FLAGGED',
}


@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class User {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop()
  avatar_url: string;
  
  @Prop()
  full_name: string;

  @Prop()
  bio: string;

  @Prop()
  job: string;

  @Prop()
  location: string;

  @Prop()
  cover_url: string;

  @Prop()
  phone: string;
  
  @Prop()
  gender: string;

  @Prop()
  birthdate: Date;

  @Prop({ type: [String], enum: UserRoleAdmin, default: [UserRoleAdmin.NONE] })
  roles_admin: UserRoleAdmin[];
  
  @Prop({ type: String, enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Prop({ default: 0 })
  warning_count: number;

  @Prop()
  last_login: Date;

  created_at: Date;
  updated_at: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);