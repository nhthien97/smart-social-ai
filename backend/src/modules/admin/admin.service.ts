
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserActivityLog, ActivityType } from './schemas/user-activity-log.schema';
import { SystemLogs } from './schemas/system-logs.schema';
import { SystemSettings, DataType } from './schemas/system-settings.schema';
import { UsersService } from '../users/users.service';
import { Group } from '../groups/schemas/group.scheme';
import { GroupMember } from '../groups/schemas/group-member.scheme';
import { Post, PostStatus } from '../posts/schemas/post.scheme';
import { User, UserRoleAdmin, UserStatus } from '../users/schemas/user.scheme';
import { Report, ReportStatus } from '../reports/schemas/report.scheme';
import { FirebaseService } from '../../common/services/firebase.service';
import { QuerySystemLogsDto } from './dto/system-logs.dto';
import { QueryUserActivityLogsDto } from './dto/user-activity-logs.dto';
import { CreateSystemSettingDto, UpdateSystemSettingDto } from './dto/system-settings.dto';

@Injectable()
export class AdminService {
    constructor(
        @InjectModel(SystemLogs.name) private systemLogsModel: Model<SystemLogs>,
        @InjectModel(SystemSettings.name) private systemSettingsModel: Model<SystemSettings>,
        @InjectModel(UserActivityLog.name) private userActivityLogModel: Model<UserActivityLog>,
        @InjectModel(Group.name) private groupModel: Model<Group>,
        @InjectModel(GroupMember.name) private groupMemberModel: Model<GroupMember>,
        @InjectModel(Post.name) private postModel: Model<Post>,
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Report.name) private reportModel: Model<Report>,
        private usersService: UsersService,
        private readonly firebaseService: FirebaseService,
    ) { }

    // User management methods
    async getAllUsers() {
        return this.usersService.findAll();
    }

    async deleteUser(id: string, adminId?: string) {
        await this.usersService.deleteUser(id);
        if (adminId) await this.writeSystemLog(adminId, 'delete_user', 'user', id);
        return { message: 'User deleted successfully' };
    }

    // Block/Unblock user methods
    async blockUser(id: string, adminId?: string) {
        const result = await this.usersService.blockUser(id);
        if (adminId) await this.writeSystemLog(adminId, 'block_user', 'user', id);
        return result;
    }

    async unblockUser(id: string, adminId?: string) {
        const result = await this.usersService.unblockUser(id);
        if (adminId) await this.writeSystemLog(adminId, 'unblock_user', 'user', id);
        return result;
    }

    // Group management methods for admin
    async getAllGroups(): Promise<any[]> {
        const groups = await this.groupModel.find().lean();
        
        // Enrich each group with owner info and actual member count
        const enriched = await Promise.all(groups.map(async (group) => {
            // Get creator info
            let owner: any = null;
            if (group.creator_id) {
                owner = await this.userModel.findById(group.creator_id)
                    .select('username full_name avatar_url').lean();
            }
            
            // Count actual members
            const memberCount = await this.groupMemberModel.countDocuments({ 
                group_id: group._id.toString(),
                status: 'ACTIVE',
            });
            
            return {
                ...group,
                owner,
                memberCount,
            };
        }));
        
        return enriched;
    }

    async getGroupDetails(groupId: string): Promise<any> {
        const group = await this.groupModel.findById(groupId).lean();
        const members = await this.groupMemberModel.find({ group_id: groupId }).lean();
        
        // Enrich members with user info
        const enrichedMembers = await Promise.all(members.map(async (member) => {
            let user: any = null;
            if (member.user_id) {
                user = await this.userModel.findById(member.user_id)
                    .select('username full_name avatar_url email').lean();
            }
            return { ...member, user };
        }));
        
        // Get owner info
        let owner: any = null;
        if (group?.creator_id) {
            owner = await this.userModel.findById(group.creator_id)
                .select('username full_name avatar_url').lean();
        }
        
        const posts = await this.postModel.find({ group_id: groupId });

        return { group: { ...group, owner }, members: enrichedMembers, posts };
    }

    async toggleGroupStatus(groupId: string, status: 'active' | 'blocked', adminId?: string): Promise<Group> {
        const updatedGroup = await this.groupModel.findByIdAndUpdate(groupId, { status }, { new: true });
        if (!updatedGroup) throw new Error('Group not found');
        if (adminId) await this.writeSystemLog(adminId, `group_${status}`, 'group', groupId);
        return updatedGroup;
    }

    // ============ Admin Account Management ============

    // Get all admin accounts (roles_admin != NONE)
    async getAdminAccounts() {
        return this.userModel.find({
            roles_admin: { $in: [UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER] }
        }).select('-password').exec();
    }

    // Get single admin account by ID
    async getAdminAccountById(userId: string) {
        const user = await this.userModel.findById(userId).select('-password').exec();
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    // Add admin role to a user account
    async addAdminAccount(userId: string, role: UserRoleAdmin) {
        if (role === UserRoleAdmin.NONE) {
            throw new Error('Cannot assign NONE role. Use removeAdminAccount instead.');
        }
        if (role === UserRoleAdmin.ADMIN) {
            throw new Error('Cannot assign ADMIN role through this endpoint.');
        }

        const user = await this.userModel.findByIdAndUpdate(
            userId,
            { $set: { roles_admin: [role] } },
            { new: true }
        ).select('-password').exec();

        if (!user) throw new Error('User not found');
        return user;
    }

    // Update admin role of a user account
    async updateAdminAccount(userId: string, role: UserRoleAdmin) {
        if (role === UserRoleAdmin.NONE) {
            throw new Error('Cannot assign NONE role. Use removeAdminAccount instead.');
        }
        if (role === UserRoleAdmin.ADMIN) {
            throw new Error('Cannot change role to ADMIN through this endpoint.');
        }

        const user = await this.userModel.findById(userId).select('-password').exec();
        if (!user) throw new Error('User not found');

        // Cannot change ADMIN role
        if (user.roles_admin?.includes(UserRoleAdmin.ADMIN)) {
            throw new Error('Cannot modify ADMIN account role.');
        }

        const updatedUser = await this.userModel.findByIdAndUpdate(
            userId,
            { $set: { roles_admin: [role] } },
            { new: true }
        ).select('-password').exec();

        return updatedUser;
    }

    // Remove admin role (set to NONE)
    async removeAdminAccount(userId: string) {
        const user = await this.userModel.findById(userId).select('-password').exec();
        if (!user) throw new Error('User not found');

        // Cannot remove ADMIN role
        if (user.roles_admin?.includes(UserRoleAdmin.ADMIN)) {
            throw new Error('Cannot remove ADMIN account.');
        }

        const updatedUser = await this.userModel.findByIdAndUpdate(
            userId,
            { $set: { roles_admin: [UserRoleAdmin.NONE] } },
            { new: true }
        ).select('-password').exec();

        return updatedUser;
    }

    // Search users to add as admin (exclude already admin users)
    async searchUsersForAdmin(query: string) {
        const filter: any = {
            roles_admin: { $nin: [UserRoleAdmin.ADMIN, UserRoleAdmin.MODERATOR, UserRoleAdmin.VIEWER] }
        };

        if (query) {
            filter.$or = [
                { username: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
                { full_name: { $regex: query, $options: 'i' } },
            ];
        }

        return this.userModel.find(filter).select('-password').limit(20).exec();
    }

    // ============ Post Management ============

    async getAllPosts(page = 1, limit = 20, status?: string, search?: string): Promise<{ posts: any[]; total: number }> {
        const query: any = {};
        if (status && status !== 'all') {
            query.status = status;
        } else {
            // Exclude deleted posts by default
            query.status = { $ne: PostStatus.DELETED };
        }

        if (search) {
            query.$or = [
                { content: { $regex: search, $options: 'i' } },
            ];
        }

        const total = await this.postModel.countDocuments(query);
        const posts = await this.postModel
            .find(query)
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean()
            .exec();

        // Enrich with user info
        const userIds = [...new Set(posts.map(p => p.user_id))];
        const users = await this.userModel
            .find({ _id: { $in: userIds } })
            .select('_id full_name username avatar_url')
            .lean()
            .exec();
        const userMap = new Map(users.map(u => [(u as any)._id.toString(), u]));

        // Count reports per post
        const postIds = posts.map(p => (p as any)._id.toString());
        const reportCounts = await this.reportModel.aggregate([
            { $match: { reported_post_id: { $in: postIds } } },
            { $group: { _id: '$reported_post_id', count: { $sum: 1 } } },
        ]);
        const reportCountMap = new Map(reportCounts.map(r => [r._id, r.count]));

        const enriched = posts.map(post => {
            const user = userMap.get(post.user_id);
            return {
                ...post,
                user_name: (user as any)?.full_name || (user as any)?.username || 'Unknown',
                username: (user as any)?.username || null,
                user_avatar: (user as any)?.avatar_url || null,
                report_count: reportCountMap.get((post as any)._id.toString()) || 0,
            };
        });

        return { posts: enriched, total };
    }

    async getPostById(id: string): Promise<any> {
        if (!Types.ObjectId.isValid(id)) {
            throw new NotFoundException(`Post not found: invalid id '${id}'`);
        }
        const post = await this.postModel.findById(id).lean().exec();
        if (!post) throw new NotFoundException('Post not found');

        const user = await this.userModel
            .findById(post.user_id)
            .select('_id full_name username avatar_url')
            .lean()
            .exec();

        const reports = await this.reportModel
            .find({ reported_post_id: id })
            .sort({ created_at: -1 })
            .exec();

        return {
            ...post,
            user_name: (user as any)?.full_name || (user as any)?.username || 'Unknown',
            username: (user as any)?.username || null,
            user_avatar: (user as any)?.avatar_url || null,
            reports,
        };
    }

    async hidePost(id: string, adminId?: string): Promise<any> {
        const post = await this.postModel.findByIdAndUpdate(id, { status: 'hidden' }, { new: true }).exec();
        if (!post) throw new NotFoundException('Post not found');
        if (adminId) await this.writeSystemLog(adminId, 'hide_post', 'post', id);
        return { message: 'Post hidden successfully', post };
    }

    async showPost(id: string, adminId?: string): Promise<any> {
        const post = await this.postModel.findByIdAndUpdate(id, { status: PostStatus.ACTIVE }, { new: true }).exec();
        if (!post) throw new NotFoundException('Post not found');
        if (adminId) await this.writeSystemLog(adminId, 'show_post', 'post', id);
        return { message: 'Post shown successfully', post };
    }

    async deletePost(id: string, adminId?: string): Promise<any> {
        const post = await this.postModel.findByIdAndUpdate(id, { status: PostStatus.DELETED }, { new: true }).exec();
        if (!post) throw new NotFoundException('Post not found');
        if (adminId) await this.writeSystemLog(adminId, 'delete_post', 'post', id);
        return { message: 'Post deleted successfully' };
    }

    // ============ Report Management ============

    async getAllReports(page = 1, limit = 20, status?: string): Promise<{ reports: any[]; total: number }> {
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
            .lean()
            .exec();

        // Enrich
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
            .select('_id full_name username avatar_url')
            .lean()
            .exec();
        const posts = await this.postModel
            .find({ _id: { $in: Array.from(postIds) } })
            .lean()
            .exec();

        const userMap = new Map(users.map(u => [(u as any)._id.toString(), u]));
        const postMap = new Map(posts.map(p => [(p as any)._id.toString(), p]));

        // Get post author info
        const postUserIds = new Set<string>();
        for (const p of posts) {
            if (p.user_id) postUserIds.add(p.user_id);
        }
        const postUsers = await this.userModel
            .find({ _id: { $in: Array.from(postUserIds) } })
            .select('_id full_name username avatar_url')
            .lean()
            .exec();
        const postUserMap = new Map(postUsers.map(u => [(u as any)._id.toString(), u]));

        const enriched = reports.map(r => {
            const reporter = userMap.get(r.reporter_id);
            const reported = userMap.get(r.reported_id);
            const post = postMap.get(r.reported_post_id);
            const postAuthor = post ? postUserMap.get(post.user_id) : null;
            const resolver = r.resolved_by ? userMap.get(r.resolved_by) : null;

            return {
                ...r,
                reporter_info: reporter ? {
                    _id: (reporter as any)._id,
                    username: (reporter as any).username,
                    full_name: (reporter as any).full_name,
                    avatar_url: (reporter as any).avatar_url,
                } : null,
                reported_user_info: reported ? {
                    _id: (reported as any)._id,
                    username: (reported as any).username,
                    full_name: (reported as any).full_name,
                } : null,
                post_info: post ? {
                    _id: (post as any)._id,
                    content: post.content,
                    media_urls: post.media_urls,
                    status: post.status,
                    user_id: post.user_id,
                    author_name: (postAuthor as any)?.full_name || (postAuthor as any)?.username || 'Unknown',
                    author_username: (postAuthor as any)?.username,
                } : null,
                resolver_info: resolver ? {
                    _id: (resolver as any)._id,
                    username: (resolver as any).username,
                    full_name: (resolver as any).full_name,
                } : null,
            };
        });

        return { reports: enriched, total };
    }

    async getReportStats(): Promise<any> {
        const total = await this.reportModel.countDocuments();
        const pending = await this.reportModel.countDocuments({ status: ReportStatus.PENDING });
        const resolved = await this.reportModel.countDocuments({ status: ReportStatus.RESOLVED });
        const rejected = await this.reportModel.countDocuments({ status: ReportStatus.REJECTED });
        return { total, pending, resolved, rejected };
    }

    async getReportById(id: string): Promise<any> {
        const report = await this.reportModel.findById(id).lean().exec();
        if (!report) throw new NotFoundException('Report not found');

        const reporter = await this.userModel.findById(report.reporter_id).select('_id full_name username avatar_url').lean().exec();
        const reported = report.reported_id ? await this.userModel.findById(report.reported_id).select('_id full_name username avatar_url').lean().exec() : null;
        const post = report.reported_post_id ? await this.postModel.findById(report.reported_post_id).lean().exec() : null;
        let postAuthor: any = null;
        if (post) {
            postAuthor = await this.userModel.findById(post.user_id).select('_id full_name username').lean().exec();
        }

        return {
            ...report,
            reporter_info: reporter,
            reported_user_info: reported,
            post_info: post ? { ...post, author_name: (postAuthor as any)?.full_name || (postAuthor as any)?.username } : null,
        };
    }

    async resolveReport(id: string, resolvedBy: string, body: { resolved_note: string; action_taken?: string }): Promise<any> {
        const report = await this.reportModel.findById(id).exec();
        if (!report) throw new NotFoundException('Report not found');

        report.status = ReportStatus.RESOLVED;
        report.resolved_at = new Date();
        report.resolved_by = resolvedBy;
        report.resolved_note = body.resolved_note;
        report.action_taken = body.action_taken || 'none';

        // Determine target user
        let targetUserId: string | null = report.reported_id || null;
        if (!targetUserId && report.reported_post_id) {
            const post = await this.postModel.findById(report.reported_post_id).exec();
            if (post) targetUserId = post.user_id;
        }

        // Apply action
        if (body.action_taken === 'remove_post' && report.reported_post_id) {
            await this.postModel.findByIdAndUpdate(report.reported_post_id, { status: PostStatus.DELETED });
            if (targetUserId) {
                await this.createNotification(targetUserId, resolvedBy, 'report_post_removed',
                    'Bài viết của bạn đã bị xóa do vi phạm quy định cộng đồng.', report.reported_post_id, 'post');
            }
        } else if (body.action_taken === 'hide_post' && report.reported_post_id) {
            await this.postModel.findByIdAndUpdate(report.reported_post_id, { status: PostStatus.HIDDEN });
            if (targetUserId) {
                await this.createNotification(targetUserId, resolvedBy, 'report_post_hidden',
                    'Bài viết của bạn đã bị ẩn do vi phạm quy định cộng đồng.', report.reported_post_id, 'post');
            }
        } else if (body.action_taken === 'warn_user' && targetUserId) {
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
        } else if (body.action_taken === 'ban_user' && targetUserId) {
            await this.userModel.findByIdAndUpdate(targetUserId, { status: UserStatus.BLOCKED });
            await this.createNotification(targetUserId, resolvedBy, 'account_blocked',
                'Tài khoản của bạn đã bị khóa do vi phạm nghiêm trọng quy định cộng đồng.', undefined, 'system');
        }

        await report.save();

        // Also resolve other pending reports for the same post
        if (report.reported_post_id) {
            await this.reportModel.updateMany(
                {
                    reported_post_id: report.reported_post_id,
                    _id: { $ne: report._id },
                    status: ReportStatus.PENDING,
                },
                {
                    status: ReportStatus.RESOLVED,
                    resolved_at: new Date(),
                    resolved_by: resolvedBy,
                    resolved_note: `Auto-resolved: same post handled via report ${id}`,
                    action_taken: body.action_taken || 'none',
                },
            );
        }

        // Ghi log
        await this.writeSystemLog(resolvedBy, 'resolve_report', 'report', id, {
            action_taken: body.action_taken,
            resolved_note: body.resolved_note,
        });

        return { message: 'Report resolved successfully', report };
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

    async rejectReport(id: string, resolvedBy: string, body: { resolved_note: string }): Promise<any> {
        const report = await this.reportModel.findById(id).exec();
        if (!report) throw new NotFoundException('Report not found');

        report.status = ReportStatus.REJECTED;
        report.resolved_at = new Date();
        report.resolved_by = resolvedBy;
        report.resolved_note = body.resolved_note;
        report.action_taken = 'none';

        await report.save();

        await this.writeSystemLog(resolvedBy, 'reject_report', 'report', id, { resolved_note: body.resolved_note });

        return { message: 'Report rejected', report };
    }

    // ============ System Logs (Admin Logs / Audit Trail) ============

    /** Ghi system log — gọi nội bộ từ mọi admin action */
    async writeSystemLog(
        userId: string, action: string, entityType?: string,
        entityId?: string, details?: Record<string, any>,
        ipAddress?: string, userAgent?: string,
    ): Promise<void> {
        try {
            await this.systemLogsModel.create({
                user_id: new Types.ObjectId(userId),
                action,
                entity_type: entityType || null,
                entity_id: entityId || null,
                details: details || null,
                ip_address: ipAddress || null,
                user_agent: userAgent || null,
                created_at: new Date(),
            });
        } catch (err) {
            // Không throw — log lỗi nhẹ, không ảnh hưởng business
            console.error('[AdminService] writeSystemLog error:', err?.message);
        }
    }

    /** UC: Xem danh sách admin logs (phân trang + search + filter) */
    async getSystemLogs(dto: QuerySystemLogsDto): Promise<{
        logs: any[]; total: number; page: number; limit: number; totalPages: number;
    }> {
        const { search, action, entity_type, user_id, from, to, page = 1, limit = 20 } = dto;
        const query: any = {};

        if (search) {
            query.$or = [
                { action: { $regex: search, $options: 'i' } },
                { entity_type: { $regex: search, $options: 'i' } },
                { entity_id: { $regex: search, $options: 'i' } },
            ];
        }
        if (action) query.action = action;
        if (entity_type) query.entity_type = entity_type;
        if (user_id) query.user_id = new Types.ObjectId(user_id);
        if (from || to) {
            query.created_at = {};
            if (from) query.created_at.$gte = new Date(from);
            if (to) query.created_at.$lte = new Date(to);
        }

        const total = await this.systemLogsModel.countDocuments(query);
        const logs = await this.systemLogsModel
            .find(query)
            .sort({ created_at: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean()
            .exec();

        // Enrich: thêm username/avatar cho admin đã thực hiện action
        const adminIds = [...new Set(logs.map(l => l.user_id?.toString()).filter(Boolean))];
        const admins = await this.userModel
            .find({ _id: { $in: adminIds } })
            .select('_id username full_name avatar_url')
            .lean()
            .exec();
        const adminMap = new Map(admins.map(a => [(a as any)._id.toString(), a]));

        const enriched = logs.map(log => {
            const admin = adminMap.get(log.user_id?.toString());
            return {
                ...log,
                admin_username: (admin as any)?.username || 'system',
                admin_full_name: (admin as any)?.full_name || null,
                admin_avatar: (admin as any)?.avatar_url || null,
            };
        });

        return { logs: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    /** UC: Xem chi tiết 1 log entry */
    async getSystemLogById(id: string): Promise<any> {
        const log = await this.systemLogsModel.findById(id).lean().exec();
        if (!log) throw new NotFoundException('System log not found');

        let adminInfo: any = null;
        if (log.user_id) {
            adminInfo = await this.userModel
                .findById(log.user_id)
                .select('_id username full_name avatar_url email')
                .lean()
                .exec();
        }

        return { ...log, admin_info: adminInfo };
    }

    /** UC: Export logs — trả về tất cả logs theo filter (không phân trang) */
    async exportSystemLogs(dto: QuerySystemLogsDto): Promise<any[]> {
        const { search, action, entity_type, user_id, from, to } = dto;
        const query: any = {};

        if (search) {
            query.$or = [
                { action: { $regex: search, $options: 'i' } },
                { entity_type: { $regex: search, $options: 'i' } },
                { entity_id: { $regex: search, $options: 'i' } },
            ];
        }
        if (action) query.action = action;
        if (entity_type) query.entity_type = entity_type;
        if (user_id) query.user_id = new Types.ObjectId(user_id);
        if (from || to) {
            query.created_at = {};
            if (from) query.created_at.$gte = new Date(from);
            if (to) query.created_at.$lte = new Date(to);
        }

        const logs = await this.systemLogsModel
            .find(query)
            .sort({ created_at: -1 })
            .limit(5000) // giới hạn export
            .lean()
            .exec();

        const adminIds = [...new Set(logs.map(l => l.user_id?.toString()).filter(Boolean))];
        const admins = await this.userModel
            .find({ _id: { $in: adminIds } })
            .select('_id username full_name')
            .lean()
            .exec();
        const adminMap = new Map(admins.map(a => [(a as any)._id.toString(), a]));

        return logs.map(log => ({
            _id: (log as any)._id,
            admin_username: (adminMap.get(log.user_id?.toString()) as any)?.username || 'system',
            action: log.action,
            entity_type: log.entity_type,
            entity_id: log.entity_id,
            details: log.details,
            ip_address: log.ip_address,
            created_at: log.created_at,
        }));
    }

    /** Lấy danh sách action types đã có (dùng cho filter dropdown) */
    async getSystemLogActionTypes(): Promise<string[]> {
        return this.systemLogsModel.distinct('action').exec();
    }

    // ============ User Activity Logs ============

    /** Ghi user activity — gọi từ các module khác khi user thao tác */
    async writeUserActivity(userId: string, activityType: ActivityType): Promise<void> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            await this.userActivityLogModel.findOneAndUpdate(
                { user_id: new Types.ObjectId(userId), activity_date: today, activity_type: activityType },
                { $inc: { activity_count: 1 } },
                { upsert: true, new: true },
            ).exec();
        } catch (err) {
            console.error('[AdminService] writeUserActivity error:', err?.message);
        }
    }

    /** UC: Xem danh sách user activity logs (phân trang + search + filter) */
    async getUserActivityLogs(dto: QueryUserActivityLogsDto): Promise<{
        logs: any[]; total: number; page: number; limit: number; totalPages: number;
    }> {
        const { search, user_id, activity_type, from, to, page = 1, limit = 20 } = dto;

        // Nếu có search, tìm user trước
        let userIds: string[] | null = null;
        if (search) {
            const matchedUsers = await this.userModel
                .find({
                    $or: [
                        { username: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } },
                        { full_name: { $regex: search, $options: 'i' } },
                    ],
                })
                .select('_id')
                .lean()
                .exec();
            userIds = matchedUsers.map(u => (u as any)._id.toString());
            if (userIds.length === 0) {
                return { logs: [], total: 0, page, limit, totalPages: 0 };
            }
        }

        const query: any = {};
        if (user_id) query.user_id = new Types.ObjectId(user_id);
        else if (userIds) query.user_id = { $in: userIds.map(id => new Types.ObjectId(id)) };
        if (activity_type) query.activity_type = activity_type;
        if (from || to) {
            query.activity_date = {};
            if (from) query.activity_date.$gte = new Date(from);
            if (to) query.activity_date.$lte = new Date(to);
        }

        const total = await this.userActivityLogModel.countDocuments(query);
        const logs = await this.userActivityLogModel
            .find(query)
            .sort({ activity_date: -1, activity_type: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean()
            .exec();

        // Enrich with user info
        const logUserIds = [...new Set(logs.map(l => l.user_id?.toString()).filter(Boolean))];
        const users = await this.userModel
            .find({ _id: { $in: logUserIds } })
            .select('_id username full_name avatar_url')
            .lean()
            .exec();
        const userMap = new Map(users.map(u => [(u as any)._id.toString(), u]));

        const enriched = logs.map(log => {
            const user = userMap.get(log.user_id?.toString());
            return {
                ...log,
                username: (user as any)?.username || 'unknown',
                full_name: (user as any)?.full_name || null,
                avatar_url: (user as any)?.avatar_url || null,
            };
        });

        return { logs: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    /** UC: Tổng hợp thống kê theo user (top active users) */
    async getUserActivitySummary(userId?: string, from?: string, to?: string): Promise<any> {
        const match: any = {};
        if (userId) match.user_id = new Types.ObjectId(userId);
        if (from || to) {
            match.activity_date = {};
            if (from) match.activity_date.$gte = new Date(from);
            if (to) match.activity_date.$lte = new Date(to);
        }

        const pipeline: any[] = [
            { $match: match },
            {
                $group: {
                    _id: userId ? '$activity_type' : '$user_id',
                    total_count: { $sum: '$activity_count' },
                    days_active: { $addToSet: '$activity_date' },
                },
            },
            { $addFields: { days_active_count: { $size: '$days_active' } } },
            { $project: { days_active: 0 } },
            { $sort: { total_count: -1 } },
            { $limit: userId ? 50 : 20 },
        ];

        const results = await this.userActivityLogModel.aggregate(pipeline).exec();

        if (!userId) {
            // Enrich user info
            const ids = results.map(r => r._id);
            const users = await this.userModel
                .find({ _id: { $in: ids } })
                .select('_id username full_name avatar_url')
                .lean()
                .exec();
            const userMap = new Map(users.map(u => [(u as any)._id.toString(), u]));
            return results.map(r => ({
                ...r,
                username: (userMap.get(r._id?.toString()) as any)?.username || 'unknown',
                full_name: (userMap.get(r._id?.toString()) as any)?.full_name || null,
                avatar_url: (userMap.get(r._id?.toString()) as any)?.avatar_url || null,
            }));
        }

        return results;
    }

    /** UC: Export user activity logs */
    async exportUserActivityLogs(dto: QueryUserActivityLogsDto): Promise<any[]> {
        const { user_id, activity_type, from, to } = dto;
        const query: any = {};
        if (user_id) query.user_id = new Types.ObjectId(user_id);
        if (activity_type) query.activity_type = activity_type;
        if (from || to) {
            query.activity_date = {};
            if (from) query.activity_date.$gte = new Date(from);
            if (to) query.activity_date.$lte = new Date(to);
        }

        const logs = await this.userActivityLogModel
            .find(query)
            .sort({ activity_date: -1 })
            .limit(5000)
            .lean()
            .exec();

        const logUserIds = [...new Set(logs.map(l => l.user_id?.toString()).filter(Boolean))];
        const users = await this.userModel
            .find({ _id: { $in: logUserIds } })
            .select('_id username full_name')
            .lean()
            .exec();
        const userMap = new Map(users.map(u => [(u as any)._id.toString(), u]));

        return logs.map(log => ({
            _id: (log as any)._id,
            username: (userMap.get(log.user_id?.toString()) as any)?.username || 'unknown',
            activity_type: log.activity_type,
            activity_count: log.activity_count,
            activity_date: log.activity_date,
        }));
    }

    // ============ System Settings (CRUD) ============

    /** UC: Lấy tất cả settings */
    async getAllSettings(): Promise<any[]> {
        return this.systemSettingsModel.find().sort({ setting_key: 1 }).lean().exec();
    }

    /** UC: Lấy setting theo key */
    async getSettingByKey(key: string): Promise<any> {
        const setting = await this.systemSettingsModel.findOne({ setting_key: key }).lean().exec();
        if (!setting) throw new NotFoundException(`Setting '${key}' not found`);
        return setting;
    }

    /** UC: Lấy settings public (không cần auth) */
    async getPublicSettings(): Promise<any[]> {
        return this.systemSettingsModel.find({ is_public: true }).sort({ setting_key: 1 }).lean().exec();
    }

    /** UC: Tạo setting mới */
    async createSetting(dto: CreateSystemSettingDto, adminId: string): Promise<any> {
        const exists = await this.systemSettingsModel.findOne({ setting_key: dto.setting_key }).exec();
        if (exists) throw new ConflictException(`Setting key '${dto.setting_key}' already exists`);

        const setting = await this.systemSettingsModel.create({
            ...dto,
            updated_by: new Types.ObjectId(adminId),
        });

        // Ghi log
        await this.writeSystemLog(adminId, 'create_setting', 'setting', dto.setting_key, {
            setting_key: dto.setting_key,
            setting_value: dto.setting_value,
            data_type: dto.data_type,
        });

        return setting.toObject();
    }

    /** UC: Cập nhật setting */
    async updateSetting(key: string, dto: UpdateSystemSettingDto, adminId: string): Promise<any> {
        const setting = await this.systemSettingsModel.findOne({ setting_key: key }).exec();
        if (!setting) throw new NotFoundException(`Setting '${key}' not found`);

        const oldValue = setting.setting_value;

        if (dto.setting_value !== undefined) setting.setting_value = dto.setting_value;
        if (dto.data_type !== undefined) setting.data_type = dto.data_type;
        if (dto.description !== undefined) setting.description = dto.description;
        if (dto.is_public !== undefined) setting.is_public = dto.is_public;
        setting.updated_by = new Types.ObjectId(adminId);

        await setting.save();

        // Ghi log
        await this.writeSystemLog(adminId, 'update_setting', 'setting', key, {
            old_value: oldValue,
            new_value: dto.setting_value ?? setting.setting_value,
        });

        return setting.toObject();
    }

    /** UC: Xóa setting */
    async deleteSetting(key: string, adminId: string): Promise<any> {
        const setting = await this.systemSettingsModel.findOneAndDelete({ setting_key: key }).exec();
        if (!setting) throw new NotFoundException(`Setting '${key}' not found`);

        // Ghi log
        await this.writeSystemLog(adminId, 'delete_setting', 'setting', key);

        return { message: `Setting '${key}' deleted successfully` };
    }

    /** Seed default settings nếu chưa có */
    async seedDefaultSettings(): Promise<void> {
        const defaults = [
            { setting_key: 'max_post_length', setting_value: '5000', data_type: DataType.NUMBER, description: 'Số ký tự tối đa của bài viết', is_public: true },
            { setting_key: 'max_upload_size_mb', setting_value: '10', data_type: DataType.NUMBER, description: 'Kích thước file upload tối đa (MB)', is_public: true },
            { setting_key: 'allow_registration', setting_value: 'true', data_type: DataType.BOOLEAN, description: 'Cho phép đăng ký tài khoản mới', is_public: true },
            { setting_key: 'max_warnings_before_ban', setting_value: '3', data_type: DataType.NUMBER, description: 'Số cảnh cáo tối đa trước khi khóa tài khoản', is_public: true },
            { setting_key: 'maintenance_mode', setting_value: 'false', data_type: DataType.BOOLEAN, description: 'Chế độ bảo trì hệ thống', is_public: true },
            { setting_key: 'maintenance_message', setting_value: 'Hệ thống đang bảo trì, vui lòng quay lại sau.', data_type: DataType.STRING, description: 'Thông báo bảo trì', is_public: true },
            { setting_key: 'default_avatar_url', setting_value: '', data_type: DataType.STRING, description: 'URL avatar mặc định', is_public: true },
            { setting_key: 'max_group_members', setting_value: '500', data_type: DataType.NUMBER, description: 'Số thành viên tối đa mỗi nhóm', is_public: true },
            { setting_key: 'max_groups_per_user', setting_value: '20', data_type: DataType.NUMBER, description: 'Số nhóm tối đa mỗi người dùng', is_public: true },
            { setting_key: 'max_images_per_post', setting_value: '10', data_type: DataType.NUMBER, description: 'Số ảnh tối đa mỗi bài viết', is_public: true },
            { setting_key: 'allowed_image_types', setting_value: 'jpg,jpeg,png,webp,gif', data_type: DataType.STRING, description: 'Định dạng ảnh cho phép', is_public: true },
        ];

        for (const d of defaults) {
            await this.systemSettingsModel.updateOne(
                { setting_key: d.setting_key },
                { $setOnInsert: d },
                { upsert: true },
            );
        }
    }
}
