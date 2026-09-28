import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { DailyStats, DailyStatsSchema } from './schemas/daily-stats.schema';
import { MonthlyStats, MonthlyStatsSchema } from './schemas/monthly-stats.schema';
import { User, UserSchema } from '../users/schemas/user.scheme';
import { Post, PostSchema } from '../posts/schemas/post.scheme';
import { Group, GroupSchema } from '../groups/schemas/group.scheme';
import { Report, ReportSchema } from '../reports/schemas/report.scheme';
import { Like, LikeSchema } from '../likes/schemas/like.scheme';
import { Comment, CommentSchema } from '../comments/schemas/comment.scheme';
import { Message, MessageSchema } from '../messages/schemas/messages.scheme';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DailyStats.name, schema: DailyStatsSchema },
      { name: MonthlyStats.name, schema: MonthlyStatsSchema },
      { name: User.name, schema: UserSchema },
      { name: Post.name, schema: PostSchema },
      { name: Group.name, schema: GroupSchema },
      { name: Report.name, schema: ReportSchema },
      { name: Like.name, schema: LikeSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
