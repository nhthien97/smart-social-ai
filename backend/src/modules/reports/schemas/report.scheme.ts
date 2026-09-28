
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ReportDocument = HydratedDocument<Report>;

export enum ReportType {
    POST = 'post',
    USER = 'user',
    COMMENT = 'comment',
}

export enum ReportStatus {
    PENDING = 'pending',
    RESOLVED = 'resolved',
    REJECTED = 'rejected',
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Report {
    @Prop({ required: true })
    reporter_id: string;

    @Prop()
    reported_id: string;

    @Prop()
    reported_post_id: string;

    @Prop()
    group_id: string;

    @Prop({ type: String, enum: ReportType, default: ReportType.POST })
    type: string;

    @Prop({ required: true })
    reason: string;

    @Prop()
    description: string;

    @Prop([String])
    evidence_urls: string[];

    @Prop({ type: String, enum: ReportStatus, default: ReportStatus.PENDING })
    status: string;

    @Prop()
    resolved_at: Date;

    @Prop()
    resolved_by: string;

    @Prop()
    resolved_note: string;

    @Prop()
    action_taken: string;

    created_at: Date;
    updated_at: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);