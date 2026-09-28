
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report, ReportStatus } from './schemas/report.scheme';
import { CreateReportDto, ResolveReportDto } from './dto/create-report.dto';
import { Post, PostStatus } from '../posts/schemas/post.scheme';
import { User, UserStatus } from '../users/schemas/user.scheme';
import { FirebaseService } from '../../common/services/firebase.service';
import { UserInteractionsService } from '../user-interactions/user-interactions.service';
import { InteractionType } from '../user-interactions/schemas/user-interaction.schema';
import { AdminService } from '../admin/admin.service';
import { ActivityType } from '../admin/schemas/user-activity-log.schema';

@Injectable()
export class ReportsService {
    constructor(
        @InjectModel(Report.name) private reportModel: Model<Report>,
        @InjectModel(Post.name) private postModel: Model<Post>,
        @InjectModel(User.name) private userModel: Model<User>,
        private readonly firebaseService: FirebaseService,
        private readonly userInteractionsService: UserInteractionsService,
        private readonly adminService: AdminService,
    ) { }

    async create(createReportDto: CreateReportDto): Promise<Report> {
        const createdReport = new this.reportModel({
            ...createReportDto,
            status: ReportStatus.PENDING,
        });

        // Ghi interaction REPORT (weight âm) → hệ thống khuyến nghị giảm đề xuất
        // bài viết tương tự cho người báo cáo
        if (createReportDto.reported_post_id) {
            try {
                await this.userInteractionsService.record({
                    user_id: createReportDto.reporter_id,
                    post_id: createReportDto.reported_post_id,
                    interaction_type: InteractionType.REPORT,
                });
            } catch { }
        }

        const saved = await createdReport.save();

        // Ghi user activity log
        this.adminService.writeUserActivity(createReportDto.reporter_id, ActivityType.REPORT_POST).catch(() => {});

        return saved;
    }

    async findAll(page = 1, limit = 20, status?: string): Promise<{ reports: any[]; total: number }> {
        const query: any = {};
        if (status && status !== 'all') {
            query.status = status;
        }

        const total = await this.reportModel.countDocuments(query);
        const reports = await this.reportModel
            .find(query)
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .exec();

        const enriched = await this.enrichReports(reports);
        return { reports: enriched, total };
    }

    async findById(id: string): Promise<any> {
        const report = await this.reportModel.findById(id).exec();
        if (!report) throw new NotFoundException('Report not found');
        const enriched = await this.enrichReports([report]);
        return enriched[0];
    }

    async findByReporter(reporterId: string): Promise<Report[]> {
        return this.reportModel
            .find({ reporter_id: reporterId })
            .sort({ created_at: -1 })
            .exec();
    }

    async findByPostId(postId: string): Promise<Report[]> {
        return this.reportModel
            .find({ reported_post_id: postId })
            .exec();
    }

    async resolve(id: string, resolvedBy: string, dto: ResolveReportDto): Promise<any> {
        const report = await this.reportModel.findById(id).exec();
        if (!report) throw new NotFoundException('Report not found');

        report.status = ReportStatus.RESOLVED;
        report.resolved_at = new Date();
        report.resolved_by = resolvedBy;
        report.resolved_note = dto.resolved_note;
        report.action_taken = dto.action_taken || 'none';

        // Determine the target user (post author or reported user)
        let targetUserId: string | null = report.reported_id || null;
        if (!targetUserId && report.reported_post_id) {
            const post = await this.postModel.findById(report.reported_post_id).exec();
            if (post) targetUserId = post.user_id;
        }

        // Apply action
        if (dto.action_taken === 'remove_post' && report.reported_post_id) {
            await this.postModel.findByIdAndUpdate(report.reported_post_id, {
                status: PostStatus.DELETED,
            });
            // Notify post author
            if (targetUserId) {
                await this.createNotification(targetUserId, resolvedBy, 'report_post_removed',
                    'Bài viết của bạn đã bị xóa do vi phạm quy định cộng đồng.', report.reported_post_id, 'post');
            }
        } else if (dto.action_taken === 'hide_post' && report.reported_post_id) {
            await this.postModel.findByIdAndUpdate(report.reported_post_id, {
                status: PostStatus.HIDDEN,
            });
            if (targetUserId) {
                await this.createNotification(targetUserId, resolvedBy, 'report_post_hidden',
                    'Bài viết của bạn đã bị ẩn do vi phạm quy định cộng đồng.', report.reported_post_id, 'post');
            }
        } else if (dto.action_taken === 'warn_user' && targetUserId) {
            // Increment warning count, flag at 2, block at 3
            const user = await this.userModel.findById(targetUserId).exec();
            if (user) {
                const newWarningCount = (user.warning_count || 0) + 1;
                const updates: any = { warning_count: newWarningCount };

                if (newWarningCount >= 3) {
                    updates.status = UserStatus.BLOCKED;
                    await this.createNotification(targetUserId, resolvedBy, 'account_blocked',
                        `Tài khoản của bạn đã bị khóa do vi phạm quy định cộng đồng ${newWarningCount} lần.`, undefined, 'system');
                } else if (newWarningCount >= 2) {
                    updates.status = UserStatus.FLAGGED;
                    await this.createNotification(targetUserId, resolvedBy, 'account_warning',
                        `Cảnh cáo lần ${newWarningCount}: Bạn đã bị đánh dấu cờ. Thêm 1 lần vi phạm nữa sẽ bị khóa tài khoản.`, undefined, 'system');
                } else {
                    await this.createNotification(targetUserId, resolvedBy, 'account_warning',
                        `Cảnh cáo lần ${newWarningCount}: Bạn đã vi phạm quy định cộng đồng. Vui lòng tuân thủ để tránh bị khóa tài khoản.`, undefined, 'system');
                }

                await this.userModel.findByIdAndUpdate(targetUserId, updates);
            }
        } else if (dto.action_taken === 'ban_user' && targetUserId) {
            await this.userModel.findByIdAndUpdate(targetUserId, {
                status: UserStatus.BLOCKED,
            });
            await this.createNotification(targetUserId, resolvedBy, 'account_blocked',
                'Tài khoản của bạn đã bị khóa do vi phạm nghiêm trọng quy định cộng đồng.', undefined, 'system');
        }

        await report.save();
        const enriched = await this.enrichReports([report]);
        return enriched[0];
    }

    // Helper to create in-app notification
    private async createNotification(
        userId: string, senderId: string, type: string,
        content: string, refId?: string, refType?: string,
    ) {
        await this.firebaseService.writeNotification({
            user_id: userId, sender_id: senderId, type, content,
            ref_id: refId, ref_type: refType || 'system',
        });
    }

    async reject(id: string, resolvedBy: string, dto: ResolveReportDto): Promise<any> {
        const report = await this.reportModel.findById(id).exec();
        if (!report) throw new NotFoundException('Report not found');

        report.status = ReportStatus.REJECTED;
        report.resolved_at = new Date();
        report.resolved_by = resolvedBy;
        report.resolved_note = dto.resolved_note;
        report.action_taken = 'none';

        await report.save();
        const enriched = await this.enrichReports([report]);
        return enriched[0];
    }

    async getStats(): Promise<any> {
        const total = await this.reportModel.countDocuments();
        const pending = await this.reportModel.countDocuments({ status: ReportStatus.PENDING });
        const resolved = await this.reportModel.countDocuments({ status: ReportStatus.RESOLVED });
        const rejected = await this.reportModel.countDocuments({ status: ReportStatus.REJECTED });

        return { total, pending, resolved, rejected };
    }

    private async enrichReports(reports: Report[]): Promise<any[]> {
        const userIds = new Set<string>();
        const postIds = new Set<string>();

        for (const r of reports) {
            if (r.reporter_id) userIds.add(r.reporter_id);
            if (r.reported_id) userIds.add(r.reported_id);
            if (r.resolved_by) userIds.add(r.resolved_by);
            if (r.reported_post_id) postIds.add(r.reported_post_id);
        }

        const users = await this.userModel
            .find({ _id: { $in: Array.from(userIds) } })
            .select('username full_name avatar_url email')
            .exec();

        const posts = await this.postModel
            .find({ _id: { $in: Array.from(postIds) } })
            .exec();

        const userMap = new Map(users.map(u => [u._id.toString(), u]));
        const postMap = new Map(posts.map(p => [p._id.toString(), p]));

        return reports.map(r => {
            const obj = (r as any).toObject ? (r as any).toObject() : r;
            const reporter = userMap.get(r.reporter_id);
            const reported = userMap.get(r.reported_id);
            const post = postMap.get(r.reported_post_id);
            const resolver = userMap.get(r.resolved_by);

            return {
                ...obj,
                reporter_info: reporter ? {
                    _id: reporter._id,
                    username: reporter.username,
                    full_name: reporter.full_name,
                    avatar_url: reporter.avatar_url,
                } : null,
                reported_user_info: reported ? {
                    _id: reported._id,
                    username: reported.username,
                    full_name: reported.full_name,
                    avatar_url: reported.avatar_url,
                } : null,
                post_info: post ? {
                    _id: post._id,
                    content: post.content,
                    media_urls: post.media_urls,
                    user_id: post.user_id,
                    status: post.status,
                    created_at: post.created_at,
                } : null,
                resolver_info: resolver ? {
                    _id: resolver._id,
                    username: resolver.username,
                    full_name: resolver.full_name,
                } : null,
            };
        });
    }
}
