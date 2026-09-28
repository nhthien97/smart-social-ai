import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment } from './schemas/comment.scheme';
import { CreateCommentDto } from './dto/create-comment.dto';
import { FirebaseService } from '../../common/services/firebase.service';
import { UserInteractionsService } from '../user-interactions/user-interactions.service';
import { InteractionType } from '../user-interactions/schemas/user-interaction.schema';
import { AdminService } from '../admin/admin.service';
import { ActivityType } from '../admin/schemas/user-activity-log.schema';

@Injectable()
export class CommentsService {
    constructor(
        @InjectModel(Comment.name) private commentModel: Model<Comment>,
        @InjectModel('User') private userModel: Model<any>,
        @InjectModel('Like') private likeModel: Model<any>,
        @InjectModel('Post') private postModel: Model<any>,
        private readonly firebaseService: FirebaseService,
        private readonly userInteractionsService: UserInteractionsService,
        private readonly adminService: AdminService,
    ) { }

    async create(createCommentDto: CreateCommentDto): Promise<Comment> {
        const content = createCommentDto.content?.trim();
        if (!content) {
            throw new BadRequestException('Comment cannot be empty');
        }
        if (content.length > 1000) {
            throw new BadRequestException('Comment must not exceed 1000 characters');
        }

        const createdComment = new this.commentModel({
            ...createCommentDto,
            content,
            likes_count: 0,
        });
        const saved = await createdComment.save();

        // Ghi interaction cho hệ thống khuyến nghị
        if (createCommentDto.post_id && createCommentDto.user_id) {
            await this.userInteractionsService.record({
                user_id: createCommentDto.user_id,
                post_id: createCommentDto.post_id,
                interaction_type: InteractionType.COMMENT,
            });
        }

        // Send notification to post owner
        await this.sendCommentNotification(createCommentDto);

        // Ghi user activity log
        if (createCommentDto.user_id) {
            this.adminService.writeUserActivity(createCommentDto.user_id, ActivityType.COMMENT).catch(() => {});
        }

        return saved;
    }

    async findByPostId(postId: string, currentUserId?: string): Promise<any[]> {
        const comments = await this.commentModel
            .find({ post_id: postId, parent_id: { $exists: false } })
            .sort({ created_at: -1 })
            .lean()
            .exec();

        return this.enrichCommentsWithUserInfo(comments, currentUserId);
    }

    async findReplies(parentId: string, currentUserId?: string): Promise<any[]> {
        const replies = await this.commentModel
            .find({ parent_id: parentId })
            .sort({ created_at: 1 })
            .lean()
            .exec();

        return this.enrichCommentsWithUserInfo(replies, currentUserId);
    }

    async findOne(id: string): Promise<Comment> {
        const comment = await this.commentModel.findById(id).exec();
        if (!comment) {
            throw new NotFoundException(`Comment with ID ${id} not found`);
        }
        return comment;
    }

    async delete(id: string): Promise<Comment> {
        const deletedComment = await this.commentModel.findByIdAndDelete(id).exec();
        if (!deletedComment) {
            throw new NotFoundException(`Comment with ID ${id} not found`);
        }
        return deletedComment;
    }

    async incrementLikesCount(id: string, increment: number): Promise<void> {
        await this.commentModel
            .findByIdAndUpdate(id, { $inc: { likes_count: increment } })
            .exec();
    }

    async countByPostId(postId: string): Promise<number> {
        return this.commentModel.countDocuments({ post_id: postId }).exec();
    }

    private async sendCommentNotification(dto: CreateCommentDto) {
        try {
            const sender: any = await this.userModel.findById(dto.user_id).select('full_name username').lean().exec();
            const senderName = sender?.full_name || sender?.username || 'Ai đó';

            if (dto.parent_id) {
                // Reply to a comment - notify the parent comment owner
                const parentComment: any = await this.commentModel.findById(dto.parent_id).select('user_id').lean().exec();
                if (parentComment && parentComment.user_id !== dto.user_id) {
                    await this.firebaseService.writeNotification({
                        user_id: parentComment.user_id, sender_id: dto.user_id,
                        type: 'comment', content: `${senderName} đã trả lời bình luận của bạn.`,
                        ref_id: dto.post_id, ref_type: 'post',
                    });
                }
            }

            // Notify post owner
            const post: any = await this.postModel.findById(dto.post_id).select('user_id').lean().exec();
            if (post && post.user_id !== dto.user_id) {
                await this.firebaseService.writeNotification({
                    user_id: post.user_id, sender_id: dto.user_id,
                    type: 'comment', content: `${senderName} đã bình luận bài viết của bạn.`,
                    ref_id: dto.post_id, ref_type: 'post',
                });
            }
        } catch (e) {
            // Don't fail the comment operation if notification fails
        }
    }

    private async enrichCommentsWithUserInfo(comments: any[], currentUserId?: string): Promise<any[]> {
        if (!comments || comments.length === 0) return [];

        // Get unique user IDs
        const userIds = [...new Set(comments.map(comment => comment.user_id))];
        
        // Fetch all users at once
        const users = await this.userModel
            .find({ _id: { $in: userIds } })
            .select('_id full_name avatar_url')
            .lean()
            .exec();

        const userMap = new Map(users.map(user => [(user as any)._id.toString(), user]));

        // If currentUserId is provided, check which comments the user has liked
        let likedCommentIds = new Set();
        if (currentUserId) {
            const likes = await this.likeModel
                .find({
                    user_id: currentUserId,
                    comment_id: { $in: comments.map(c => c._id.toString()) }
                })
                .lean()
                .exec();
            likedCommentIds = new Set(likes.map(like => like.comment_id));
        }

        // Enrich comments with user info and like status
        return comments.map(comment => {
            const user = userMap.get(comment.user_id);
            return {
                ...comment,
                user_name: user?.full_name || 'Unknown User',
                user_avatar: user?.avatar_url || null,
                is_liked: likedCommentIds.has(comment._id.toString()),
            };
        });
    }
}
