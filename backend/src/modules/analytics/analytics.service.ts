
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MonthlyStats } from './schemas/monthly-stats.schema';
import { DailyStats } from './schemas/daily-stats.schema';
import { User } from '../users/schemas/user.scheme';
import { Post } from '../posts/schemas/post.scheme';
import { Group } from '../groups/schemas/group.scheme';
import { Report } from '../reports/schemas/report.scheme';
import { Like } from '../likes/schemas/like.scheme';
import { Comment } from '../comments/schemas/comment.scheme';
import { Message } from '../messages/schemas/messages.scheme';
import { QueryAnalyticsDto, AnalyticsPeriod, QueryDailyStatsDto, QueryMonthlyStatsDto } from '../admin/dto/analytics.dto';

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);

    constructor(
        @InjectModel(DailyStats.name) private dailyStatsModel: Model<DailyStats>,
        @InjectModel(MonthlyStats.name) private monthlyStatsModel: Model<MonthlyStats>,
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Post.name) private postModel: Model<Post>,
        @InjectModel(Group.name) private groupModel: Model<Group>,
        @InjectModel(Report.name) private reportModel: Model<Report>,
        @InjectModel(Like.name) private likeModel: Model<Like>,
        @InjectModel(Comment.name) private commentModel: Model<Comment>,
        @InjectModel(Message.name) private messageModel: Model<Message>,
    ) { }

    // ============ Overview (Dashboard Cards) ============

    /** UC6.8: Tổng quan thống kê hệ thống */
    async getOverview(from?: string, to?: string): Promise<any> {
        const dateFilter: any = {};
        if (from) dateFilter.$gte = new Date(from);
        if (to) dateFilter.$lte = new Date(to);
        const hasDateFilter = Object.keys(dateFilter).length > 0;

        // Compute current totals
        const [totalUsers, totalPosts, totalGroups, totalReports] = await Promise.all([
            this.userModel.countDocuments(),
            this.postModel.countDocuments({ status: { $ne: 'deleted' } }),
            this.groupModel.countDocuments(),
            this.reportModel.countDocuments(),
        ]);

        // "New" counts in period
        const periodCreatedAt = hasDateFilter ? { created_at: dateFilter } : {};

        const [newUsers, newPosts, newGroups, pendingReports, totalLikes, totalComments, totalMessages] = await Promise.all([
            this.userModel.countDocuments(hasDateFilter ? { created_at: dateFilter } : {}),
            this.postModel.countDocuments({ status: { $ne: 'deleted' }, ...periodCreatedAt }),
            this.groupModel.countDocuments(periodCreatedAt),
            this.reportModel.countDocuments({ status: 'pending' }),
            this.likeModel.countDocuments(periodCreatedAt),
            this.commentModel.countDocuments(periodCreatedAt),
            this.messageModel.countDocuments(periodCreatedAt),
        ]);

        // Active users (users who logged in in period, or approximate by distinct user_id in posts/likes/comments)
        let activeUsers = 0;
        if (hasDateFilter) {
            const [postUsers, likeUsers, commentUsers] = await Promise.all([
                this.postModel.distinct('user_id', periodCreatedAt),
                this.likeModel.distinct('user_id', periodCreatedAt),
                this.commentModel.distinct('user_id', periodCreatedAt),
            ]);
            const uniqueActive = new Set([...postUsers.map(String), ...likeUsers.map(String), ...commentUsers.map(String)]);
            activeUsers = uniqueActive.size;
        } else {
            // Last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentFilter = { created_at: { $gte: thirtyDaysAgo } };
            const [postUsers, likeUsers, commentUsers] = await Promise.all([
                this.postModel.distinct('user_id', recentFilter),
                this.likeModel.distinct('user_id', recentFilter),
                this.commentModel.distinct('user_id', recentFilter),
            ]);
            const uniqueActive = new Set([...postUsers.map(String), ...likeUsers.map(String), ...commentUsers.map(String)]);
            activeUsers = uniqueActive.size;
        }

        // Compute growth rates (so sánh với giai đoạn trước đó)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        const currentPeriod = { created_at: { $gte: thirtyDaysAgo } };
        const prevPeriod = { created_at: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } };

        const [curUsers, prevUsers, curPosts, prevPosts] = await Promise.all([
            this.userModel.countDocuments(currentPeriod),
            this.userModel.countDocuments(prevPeriod),
            this.postModel.countDocuments({ status: { $ne: 'deleted' }, ...currentPeriod }),
            this.postModel.countDocuments({ status: { $ne: 'deleted' }, ...prevPeriod }),
        ]);

        const calcGrowth = (cur: number, prev: number) => prev === 0 ? (cur > 0 ? 100 : 0) : +((cur - prev) / prev * 100).toFixed(1);

        return {
            total_users: totalUsers,
            total_posts: totalPosts,
            total_groups: totalGroups,
            total_reports: totalReports,
            pending_reports: pendingReports,
            new_users: hasDateFilter ? newUsers : curUsers,
            new_posts: hasDateFilter ? newPosts : curPosts,
            new_groups: hasDateFilter ? newGroups : 0,
            active_users: activeUsers,
            total_likes: totalLikes,
            total_comments: totalComments,
            total_messages: totalMessages,
            growth_rate: {
                users: calcGrowth(curUsers, prevUsers),
                posts: calcGrowth(curPosts, prevPosts),
            },
            engagement_rate: totalUsers > 0 ? +((activeUsers / totalUsers) * 100).toFixed(1) : 0,
        };
    }

    // ============ Growth Chart (DAU/MAU, user/post growth) ============

    /** UC: Biểu đồ tăng trưởng theo ngày/tuần/tháng */
    async getGrowthChart(dto: QueryAnalyticsDto): Promise<any[]> {
        const { period = AnalyticsPeriod.DAY } = dto;
        const from = dto.from ? new Date(dto.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const to = dto.to ? new Date(dto.to) : new Date();

        // Group by period format
        let dateGroup: any;
        if (period === AnalyticsPeriod.DAY) {
            dateGroup = { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } };
        } else if (period === AnalyticsPeriod.WEEK) {
            dateGroup = { $dateToString: { format: '%Y-W%V', date: '$created_at' } };
        } else {
            dateGroup = { $dateToString: { format: '%Y-%m', date: '$created_at' } };
        }

        const dateFilter = { created_at: { $gte: from, $lte: to } };

        const [userGrowth, postGrowth, messageGrowth] = await Promise.all([
            this.userModel.aggregate([
                { $match: dateFilter },
                { $group: { _id: dateGroup, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            this.postModel.aggregate([
                { $match: { status: { $ne: 'deleted' }, ...dateFilter } },
                { $group: { _id: dateGroup, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            this.messageModel.aggregate([
                { $match: dateFilter },
                { $group: { _id: dateGroup, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
        ]);

        // Merge into single array
        const allDates = new Set<string>();
        [userGrowth, postGrowth, messageGrowth].forEach(arr => arr.forEach(r => allDates.add(r._id)));

        const userMap = new Map(userGrowth.map(r => [r._id, r.count]));
        const postMap = new Map(postGrowth.map(r => [r._id, r.count]));
        const msgMap = new Map(messageGrowth.map(r => [r._id, r.count]));

        return Array.from(allDates).sort().map(date => ({
            date,
            new_users: userMap.get(date) || 0,
            new_posts: postMap.get(date) || 0,
            new_messages: msgMap.get(date) || 0,
        }));
    }

    // ============ Engagement Stats ============

    /** UC: Thống kê tương tác (likes, comments, shares) */
    async getEngagementStats(from?: string, to?: string): Promise<any> {
        const dateFilter: any = {};
        if (from) dateFilter.$gte = new Date(from);
        if (to) dateFilter.$lte = new Date(to);
        const hasDateFilter = Object.keys(dateFilter).length > 0;
        const createdAtFilter = hasDateFilter ? { created_at: dateFilter } : {};

        const [likes, comments, messages] = await Promise.all([
            this.likeModel.countDocuments(createdAtFilter),
            this.commentModel.countDocuments(createdAtFilter),
            this.messageModel.countDocuments(createdAtFilter),
        ]);

        // Top liked posts
        const topPosts = await this.likeModel.aggregate([
            ...(hasDateFilter ? [{ $match: { created_at: dateFilter } }] : []),
            { $group: { _id: '$post_id', like_count: { $sum: 1 } } },
            { $sort: { like_count: -1 } },
            { $limit: 10 },
        ]);

        // Activity by type (daily for last 7 days)
        const sevenDays = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const dayFormat = { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } };

        const [dailyLikes, dailyComments] = await Promise.all([
            this.likeModel.aggregate([
                { $match: { created_at: { $gte: sevenDays } } },
                { $group: { _id: dayFormat, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            this.commentModel.aggregate([
                { $match: { created_at: { $gte: sevenDays } } },
                { $group: { _id: dayFormat, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
        ]);

        return {
            total_likes: likes,
            total_comments: comments,
            total_messages: messages,
            top_liked_posts: topPosts,
            daily_likes: dailyLikes,
            daily_comments: dailyComments,
        };
    }

    // ============ Daily Stats (stored snapshots) ============

    /** UC: Lấy thống kê theo ngày (nếu đã compute) */
    async getDailyStats(dto: QueryDailyStatsDto): Promise<{
        stats: any[]; total: number; page: number; limit: number;
    }> {
        const { from, to, page = 1, limit = 30 } = dto;
        const query: any = {};
        if (from || to) {
            query.stat_date = {};
            if (from) query.stat_date.$gte = new Date(from);
            if (to) query.stat_date.$lte = new Date(to);
        }

        const total = await this.dailyStatsModel.countDocuments(query);
        const stats = await this.dailyStatsModel
            .find(query)
            .sort({ stat_date: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean()
            .exec();

        return { stats, total, page, limit };
    }

    // ============ Monthly Stats ============

    async getMonthlyStats(dto: QueryMonthlyStatsDto): Promise<any[]> {
        const { year, month, limit = 12 } = dto;
        const query: any = {};
        if (year) query.stat_year = year;
        if (month) query.stat_month = month;

        return this.monthlyStatsModel
            .find(query)
            .sort({ stat_year: -1, stat_month: -1 })
            .limit(limit)
            .lean()
            .exec();
    }

    // ============ Compute & Store stats snapshot ============

    /** Tính toán và lưu stats cho ngày hôm nay */
    async computeTodayStats(): Promise<void> {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        const dateFilter = { created_at: { $gte: today, $lt: tomorrow } };

        try {
            const [
                totalUsers, newUsers, totalPosts, newPosts,
                totalLikes, totalComments, totalGroups, newGroups,
                totalMessages,
            ] = await Promise.all([
                this.userModel.countDocuments(),
                this.userModel.countDocuments(dateFilter),
                this.postModel.countDocuments({ status: { $ne: 'deleted' } }),
                this.postModel.countDocuments({ status: { $ne: 'deleted' }, ...dateFilter }),
                this.likeModel.countDocuments(dateFilter),
                this.commentModel.countDocuments(dateFilter),
                this.groupModel.countDocuments(),
                this.groupModel.countDocuments(dateFilter),
                this.messageModel.countDocuments(dateFilter),
            ]);

            // Active users: distinct user_ids in today's posts/likes/comments
            const [pUsers, lUsers, cUsers] = await Promise.all([
                this.postModel.distinct('user_id', dateFilter),
                this.likeModel.distinct('user_id', dateFilter),
                this.commentModel.distinct('user_id', dateFilter),
            ]);
            const activeUsers = new Set([...pUsers.map(String), ...lUsers.map(String), ...cUsers.map(String)]).size;

            await this.dailyStatsModel.findOneAndUpdate(
                { stat_date: today },
                {
                    $set: {
                        stat_date: today,
                        total_users: totalUsers,
                        new_users: newUsers,
                        active_users: activeUsers,
                        total_posts: totalPosts,
                        new_posts: newPosts,
                        total_likes: totalLikes,
                        total_comments: totalComments,
                        total_messages: totalMessages,
                        total_groups: totalGroups,
                        new_groups: newGroups,
                    },
                },
                { upsert: true },
            );

            // Also update monthly
            await this.monthlyStatsModel.findOneAndUpdate(
                { stat_year: now.getFullYear(), stat_month: now.getMonth() + 1 },
                {
                    $set: {
                        total_users: totalUsers,
                        total_posts: totalPosts,
                        total_groups: totalGroups,
                    },
                    $inc: {
                        new_users: newUsers,
                        new_posts: newPosts,
                        active_users: activeUsers,
                        total_likes: totalLikes,
                        total_comments: totalComments,
                        total_messages: totalMessages,
                        new_groups: newGroups,
                    },
                },
                { upsert: true },
            );

            this.logger.log(`Daily stats computed for ${today.toISOString().split('T')[0]}`);
        } catch (err) {
            this.logger.error('Failed to compute daily stats:', err?.message);
        }
    }

    // ============ Export stats ============

    async exportStats(from?: string, to?: string): Promise<any[]> {
        const query: any = {};
        if (from || to) {
            query.stat_date = {};
            if (from) query.stat_date.$gte = new Date(from);
            if (to) query.stat_date.$lte = new Date(to);
        }

        return this.dailyStatsModel
            .find(query)
            .sort({ stat_date: -1 })
            .limit(365)
            .lean()
            .exec();
    }
}
