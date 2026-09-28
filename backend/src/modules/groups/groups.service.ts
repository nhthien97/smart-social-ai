
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Group } from './schemas/group.scheme';
import { GroupMember, GroupMemberRole, GroupMemberStatus } from './schemas/group-member.scheme';
import { Post, PostStatus } from '../posts/schemas/post.scheme';
import { User } from '../users/schemas/user.scheme';
import { Like } from '../likes/schemas/like.scheme';
import { FirebaseService } from '../../common/services/firebase.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { UpdateGroupSettingsDto } from './dto/update-group-settings.dto';
import { CreateGroupPostDto } from './dto/create-group-post.dto';
import { AdminService } from '../admin/admin.service';
import { ActivityType } from '../admin/schemas/user-activity-log.schema';

@Injectable()
export class GroupsService {
    constructor(
        @InjectModel(Group.name) private groupModel: Model<Group>,
        @InjectModel(GroupMember.name) private groupMemberModel: Model<GroupMember>,
        @InjectModel(Post.name) private postModel: Model<Post>,
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Like.name) private likeModel: Model<Like>,
        private readonly firebaseService: FirebaseService,
        private readonly adminService: AdminService,
    ) { }

    // Helper to create notification
    private async notify(userId: string, senderId: string, type: string, content: string, refId?: string, refType?: string) {
        try {
            if (userId === senderId) return; // Don't notify self
            await this.firebaseService.writeNotification({
                user_id: userId, sender_id: senderId, type, content,
                ref_id: refId, ref_type: refType,
            });
        } catch (e) {}
    }

    private async getUserName(userId: string): Promise<string> {
        try {
            const user = await this.userModel.findById(userId).select('full_name username').lean().exec();
            return (user as any)?.full_name || (user as any)?.username || 'Ai đó';
        } catch { return 'Ai đó'; }
    }

    private async getGroupName(groupId: string): Promise<string> {
        try {
            const group = await this.groupModel.findById(groupId).select('name').lean().exec();
            return (group as any)?.name || 'nhóm';
        } catch { return 'nhóm'; }
    }
    async findGroupById(id: string): Promise<Group | null> {
        return this.groupModel.findById(id).exec();
    }

    async getAllGroups(): Promise<Group[]> {
        return this.groupModel.find({ status: 'active' }).exec();
    }

    // Get groups for user (my groups + suggested)
    async getGroupsForUser(userId: string) {
        // Get user's groups
        const userMemberships = await this.groupMemberModel
            .find({ user_id: userId, status: GroupMemberStatus.ACTIVE })
            .select('group_id role')
            .exec();

        // Convert string group_id to ObjectId for correct $in query
        const userGroupIds = userMemberships.map(m => m.group_id);
        const userGroupObjectIds = userGroupIds
            .filter(id => Types.ObjectId.isValid(id))
            .map(id => new Types.ObjectId(id));

        const myGroups = await this.groupModel
            .find({ _id: { $in: userGroupObjectIds }, status: 'active' })
            .exec();

        // Sync members_count with actual active member count for each group
        const myGroupObjectIds = myGroups.map(g => g._id.toString());
        const actualCounts = await this.groupMemberModel.aggregate([
            { $match: { group_id: { $in: myGroupObjectIds }, status: GroupMemberStatus.ACTIVE } },
            { $addFields: { user_id_obj: { $toObjectId: '$user_id' } } },
            { $lookup: { from: 'users', localField: 'user_id_obj', foreignField: '_id', as: 'userDoc' } },
            { $match: { 'userDoc': { $ne: [] } } },
            { $group: { _id: '$group_id', count: { $sum: 1 } } },
        ]).exec();
        const countMap: Record<string, number> = {};
        actualCounts.forEach((c: any) => { countMap[c._id] = c.count; });

        // Update any group whose cached members_count is out of sync
        for (const group of myGroups) {
            const actualCount = countMap[group._id.toString()] ?? 0;
            if (group.members_count !== actualCount) {
                await this.groupModel.findByIdAndUpdate(group._id, { members_count: actualCount }).exec();
                group.members_count = actualCount;
            }
        }

        // Attach role to each group
        const myGroupsWithRoles = myGroups.map(group => {
            const membership = userMemberships.find(m => m.group_id === group._id.toString());
            return {
                ...group.toObject(),
                userRole: membership?.role || GroupMemberRole.MEMBER,
            };
        });

        // Get suggested groups (groups user is not part of)
        const suggestedGroups = await this.groupModel
            .find({ 
                _id: { $nin: userGroupObjectIds }, 
                status: 'active' 
            })
            .limit(10)
            .exec();

        return {
            myGroups: myGroupsWithRoles,
            suggestedGroups,
        };
    }

    // Get group detail with member info
    async getGroupDetail(groupId: string, userId: string) {
        const group = await this.groupModel.findById(groupId).exec();
        if (!group) {
            throw new NotFoundException('Group not found');
        }

        const membership = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: userId, status: GroupMemberStatus.ACTIVE })
            .exec();

        // Fetch all active members
        const membersRaw = await this.groupMemberModel
            .find({ group_id: groupId, status: GroupMemberStatus.ACTIVE })
            .exec();

        // Fetch user info for each member
        const memberUserIds = membersRaw.map(m => m.user_id);
        const memberUserObjectIds = memberUserIds
            .filter(id => Types.ObjectId.isValid(id))
            .map(id => new Types.ObjectId(id));
        const users = await this.userModel
            .find({ _id: { $in: memberUserObjectIds } })
            .select('_id username full_name avatar_url')
            .exec();
        const userMap: Record<string, any> = {};
        users.forEach(u => { userMap[u._id.toString()] = u; });

        // Filter out stale members whose users no longer exist in DB
        const validMembers: any[] = [];
        const staleMemberIds: any[] = [];
        for (const m of membersRaw) {
            const u = userMap[m.user_id];
            if (u) {
                validMembers.push({
                    userId: m.user_id,
                    role: m.role,
                    status: m.status,
                    joinedAt: m.joined_at,
                    user: {
                        _id: u._id,
                        username: u.username,
                        fullName: u.full_name,
                        avatarUrl: u.avatar_url,
                    },
                });
            } else {
                // User was deleted from DB — mark for cleanup
                staleMemberIds.push(m._id);
            }
        }

        // Clean up stale GroupMember records and sync members_count
        if (staleMemberIds.length > 0) {
            await this.groupMemberModel.deleteMany({ _id: { $in: staleMemberIds } }).exec();
            await this.groupModel.findByIdAndUpdate(groupId, {
                members_count: validMembers.length,
            }).exec();
            group.members_count = validMembers.length;
        } else if (group.members_count !== validMembers.length) {
            // Sync cached counter if it drifted
            await this.groupModel.findByIdAndUpdate(groupId, {
                members_count: validMembers.length,
            }).exec();
            group.members_count = validMembers.length;
        }

        return {
            group: group.toObject(),
            members: validMembers,
            userRole: membership?.role ?? null,
            isMember: !!membership,
            isPendingJoin: !membership ? !!(await this.groupMemberModel
                .findOne({ group_id: groupId, user_id: userId, status: GroupMemberStatus.PENDING })
                .exec()) : false,
        };
    }

    // UC5.3: Create group
    async createGroup(creatorId: string, groupData: CreateGroupDto): Promise<Group> {
        try {
            const group = new this.groupModel({ 
                ...groupData, 
                creator_id: creatorId,
                members_count: 1,
            });
            const savedGroup = await group.save();

            // Add creator as admin member
            await this.groupMemberModel.create({
                group_id: savedGroup._id.toString(),
                user_id: creatorId,
                role: GroupMemberRole.ADMIN,
                status: GroupMemberStatus.ACTIVE,
                joined_at: new Date(),
            });

            // Ghi user activity log
            this.adminService.writeUserActivity(creatorId, ActivityType.CREATE_GROUP).catch(() => {});

            return savedGroup;
        } catch (error) {
            throw new BadRequestException(`Failed to create group: ${error.message}`);
        }
    }

    // UC5.4: Update group (admin only)
    async updateGroup(groupId: string, userId: string, updateData: UpdateGroupDto): Promise<Group> {
        const member = await this.groupMemberModel.findOne({ 
            group_id: groupId, 
            user_id: userId, 
            role: GroupMemberRole.ADMIN 
        }).exec();
        
        if (!member) {
            throw new ForbiddenException('Only group admin can update group');
        }

        const updatedGroup = await this.groupModel
            .findByIdAndUpdate(groupId, updateData, { new: true })
            .exec();
            
        if (!updatedGroup) {
            throw new NotFoundException('Group not found');
        }

        // Ghi user activity log
        this.adminService.writeUserActivity(userId, ActivityType.EDIT_GROUP).catch(() => {});
        
        return updatedGroup;
    }

    // UC5.8: Cập nhật cài đặt nhóm – bật/tắt duyệt bài và duyệt thành viên (admin only)
    async updateGroupSettings(groupId: string, userId: string, settings: UpdateGroupSettingsDto): Promise<Group> {
        // Chỉ admin mới được thay đổi cài đặt
        const member = await this.groupMemberModel.findOne({
            group_id: groupId,
            user_id: userId,
            role: GroupMemberRole.ADMIN,
            status: GroupMemberStatus.ACTIVE,
        }).exec();

        if (!member) {
            throw new ForbiddenException('Chỉ admin nhóm mới có thể thay đổi cài đặt');
        }

        const updateData: Partial<{ require_post_approval: boolean; require_member_approval: boolean }> = {};
        if (settings.require_post_approval !== undefined) {
            updateData.require_post_approval = settings.require_post_approval;
        }
        if (settings.require_member_approval !== undefined) {
            updateData.require_member_approval = settings.require_member_approval;
        }

        if (Object.keys(updateData).length === 0) {
            throw new BadRequestException('Không có cài đặt nào được cập nhật');
        }

        const updated = await this.groupModel
            .findByIdAndUpdate(groupId, updateData, { new: true })
            .exec();
        if (!updated) throw new NotFoundException('Group not found');
        return updated;
    }

    // UC5.5: Delete group (admin only)
    async deleteGroup(groupId: string, userId: string): Promise<void> {
        const member = await this.groupMemberModel.findOne({ 
            group_id: groupId, 
            user_id: userId, 
            role: GroupMemberRole.ADMIN 
        }).exec();
        
        if (!member) {
            throw new ForbiddenException('Only group admin can delete group');
        }

        await this.groupModel.findByIdAndDelete(groupId).exec();
        await this.groupMemberModel.deleteMany({ group_id: groupId }).exec();
        await this.postModel.deleteMany({ group_id: groupId }).exec();

        // Ghi user activity log
        this.adminService.writeUserActivity(userId, ActivityType.DELETE_GROUP).catch(() => {});
    }

    // UC5.1: Join group (request to join)
    async joinGroup(groupId: string, userId: string): Promise<GroupMember> {
        const group = await this.groupModel.findById(groupId).exec();
        if (!group || group.status !== 'active') {
            throw new NotFoundException('Group not found or inactive');
        }

        const existingMember = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: userId })
            .exec();
            
        if (existingMember) {
            if (existingMember.status === GroupMemberStatus.PENDING) {
                throw new BadRequestException('Join request already pending');
            }
            throw new BadRequestException('Already a member');
        }

        // Check require_member_approval - if disabled, auto-approve
        const requireApproval = group.require_member_approval !== false; // default true
        const memberStatus = requireApproval ? GroupMemberStatus.PENDING : GroupMemberStatus.ACTIVE;

        const member = await this.groupMemberModel.create({
            group_id: groupId,
            user_id: userId,
            role: GroupMemberRole.MEMBER,
            status: memberStatus,
            joined_at: !requireApproval ? new Date() : undefined,
        });

        if (requireApproval) {
            await this.groupModel
                .findByIdAndUpdate(groupId, { $inc: { pending_members: 1 } })
                .exec();
            // Notify group admins about pending join request
            const userName = await this.getUserName(userId);
            const groupName = await this.getGroupName(groupId);
            const admins = await this.groupMemberModel.find({
                group_id: groupId,
                role: { $in: [GroupMemberRole.ADMIN, GroupMemberRole.MODERATOR] },
                status: GroupMemberStatus.ACTIVE,
            }).exec();
            for (const admin of admins) {
                await this.notify(admin.user_id, userId, 'group_join',
                    `${userName} yêu cầu tham gia nhóm ${groupName}.`, groupId, 'group');
            }
        } else {
            await this.groupModel
                .findByIdAndUpdate(groupId, { $inc: { members_count: 1 } })
                .exec();
        }

        return member;
    }

    // UC5.2: Leave group
    async leaveGroup(groupId: string, userId: string): Promise<void> {
        const member = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: userId })
            .exec();
            
        if (!member) {
            throw new NotFoundException('Not a member');
        }

        if (member.role === GroupMemberRole.ADMIN) {
            // Check if there are other admins
            const adminCount = await this.groupMemberModel
                .countDocuments({ group_id: groupId, role: GroupMemberRole.ADMIN })
                .exec();
                
            if (adminCount === 1) {
                throw new BadRequestException('Cannot leave: You are the only admin. Transfer admin role first.');
            }
        }

        await this.groupMemberModel.findByIdAndDelete(member._id).exec();
        
        if (member.status === GroupMemberStatus.ACTIVE) {
            await this.groupModel
                .findByIdAndUpdate(groupId, { $inc: { members_count: -1 } })
                .exec();
        }
    }

    // UC5.14: Invite member to group (mod/admin)
    async inviteMember(groupId: string, inviterId: string, inviteeId: string): Promise<GroupMember> {
        const inviter = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: inviterId })
            .exec();
            
        if (!inviter || inviter.role === GroupMemberRole.MEMBER) {
            throw new ForbiddenException('Only moderators and admins can invite members');
        }

        const existing = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: inviteeId })
            .exec();
            
        if (existing) {
            throw new BadRequestException('User already invited or is a member');
        }

        const member = await this.groupMemberModel.create({
            group_id: groupId,
            user_id: inviteeId,
            role: GroupMemberRole.MEMBER,
            status: GroupMemberStatus.PENDING,
            invited_by: inviterId,
        });

        await this.groupModel
            .findByIdAndUpdate(groupId, { $inc: { pending_members: 1 } })
            .exec();

        // Notify invitee
        const inviterName = await this.getUserName(inviterId);
        const groupName = await this.getGroupName(groupId);
        await this.notify(inviteeId, inviterId, 'group_invite',
            `${inviterName} đã mời bạn tham gia nhóm ${groupName}.`, groupId, 'group');
            
        return member;
    }

    // Get pending members
    async getPendingMembers(groupId: string, userId: string) {
        const user = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: userId })
            .exec();
            
        if (!user || (user.role !== GroupMemberRole.MODERATOR && user.role !== GroupMemberRole.ADMIN)) {
            throw new ForbiddenException('Only moderators and admins can view pending members');
        }

        const pendingMembers = await this.groupMemberModel
            .find({ group_id: groupId, status: GroupMemberStatus.PENDING })
            .exec();

        // Enrich with user info
        const userIds = pendingMembers.map(m => m.user_id)
            .filter(id => Types.ObjectId.isValid(id))
            .map(id => new Types.ObjectId(id));

        const users = await this.userModel
            .find({ _id: { $in: userIds } })
            .select('_id username full_name avatar_url')
            .exec();

        const userMap: Record<string, any> = {};
        users.forEach(u => { userMap[u._id.toString()] = u; });

        return pendingMembers.map(m => {
            const u = userMap[m.user_id];
            return {
                _id: m._id,
                userId: m.user_id,
                role: m.role,
                status: m.status,
                createdAt: m.created_at,
                user: u ? {
                    _id: u._id,
                    username: u.username,
                    fullName: u.full_name,
                    avatarUrl: u.avatar_url,
                } : null,
            };
        });
    }

    // UC5.9: Approve member (mod/admin)
    async approveMember(groupId: string, approverId: string, memberId: string): Promise<GroupMember> {
        const approver = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: approverId })
            .exec();
            
        if (!approver || (approver.role !== GroupMemberRole.MODERATOR && approver.role !== GroupMemberRole.ADMIN)) {
            throw new ForbiddenException('Only moderators and admins can approve members');
        }

        const member = await this.groupMemberModel
            .findByIdAndUpdate(
                memberId,
                { 
                    status: GroupMemberStatus.ACTIVE, 
                    joined_at: new Date() 
                },
                { new: true }
            )
            .exec();
            
        if (!member) {
            throw new NotFoundException('Member request not found');
        }

        await this.groupModel
            .findByIdAndUpdate(groupId, {
                $inc: { members_count: 1, pending_members: -1 }
            })
            .exec();

        // Notify approved member
        const groupName = await this.getGroupName(groupId);
        await this.notify(member.user_id, approverId, 'group_join',
            `Yêu cầu tham gia nhóm ${groupName} của bạn đã được chấp nhận.`, groupId, 'group');

        return member;
    }

    // Reject member request
    async rejectMember(groupId: string, rejecterId: string, memberId: string): Promise<void> {
        const rejecter = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: rejecterId })
            .exec();
            
        if (!rejecter || (rejecter.role !== GroupMemberRole.MODERATOR && rejecter.role !== GroupMemberRole.ADMIN)) {
            throw new ForbiddenException('Only moderators and admins can reject members');
        }

        const member = await this.groupMemberModel.findById(memberId).exec();
        if (!member) {
            throw new NotFoundException('Member request not found');
        }

        await this.groupMemberModel.findByIdAndDelete(memberId).exec();
        await this.groupModel
            .findByIdAndUpdate(groupId, { $inc: { pending_members: -1 } })
            .exec();

        // Notify rejected member
        const groupName = await this.getGroupName(groupId);
        await this.notify(member.user_id, rejecterId, 'group_join',
            `Yêu cầu tham gia nhóm ${groupName} của bạn đã bị từ chối.`, groupId, 'group');
    }

    // UC5.10: Remove member (mod/admin)
    async removeMember(groupId: string, removerId: string, memberId: string): Promise<void> {
        const remover = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: removerId })
            .exec();
            
        if (!remover || (remover.role !== GroupMemberRole.MODERATOR && remover.role !== GroupMemberRole.ADMIN)) {
            throw new ForbiddenException('Only moderators and admins can remove members');
        }

        // memberId is the user_id of the member to remove (not the document _id)
        const member = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: memberId })
            .exec();
        if (!member) {
            throw new NotFoundException('Member not found');
        }

        // Prevent removing admin if you're just a moderator
        if (remover.role === GroupMemberRole.MODERATOR && member.role === GroupMemberRole.ADMIN) {
            throw new ForbiddenException('Moderators cannot remove admins');
        }

        await this.groupMemberModel
            .findOneAndDelete({ group_id: groupId, user_id: memberId })
            .exec();
        
        if (member.status === GroupMemberStatus.ACTIVE) {
            await this.groupModel
                .findByIdAndUpdate(groupId, { $inc: { members_count: -1 } })
                .exec();
        }

        // Notify removed member
        const groupName = await this.getGroupName(groupId);
        await this.notify(member.user_id, removerId, 'group_role',
            `Bạn đã bị xóa khỏi nhóm ${groupName}.`, groupId, 'group');
    }

    // UC5.11: Get members list
    async getMembers(groupId: string, userId: string, status?: string) {
        const user = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: userId })
            .exec();
            
        if (!user) {
            throw new ForbiddenException('You are not a member of this group');
        }

        const query: any = { group_id: groupId };
        if (status) {
            query.status = status;
        } else {
            query.status = GroupMemberStatus.ACTIVE;
        }

        return this.groupMemberModel.find(query).exec();
    }

    // UC5.12: Update member role (admin only)
    async updateMemberRole(groupId: string, adminId: string, memberId: string, newRole: GroupMemberRole): Promise<GroupMember> {
        const admin = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: adminId, role: GroupMemberRole.ADMIN })
            .exec();
            
        if (!admin) {
            throw new ForbiddenException('Only admins can change member roles');
        }

        if (newRole === GroupMemberRole.ADMIN) {
            throw new BadRequestException('Use transfer admin endpoint to assign admin role');
        }

        const updatedMember = await this.groupMemberModel
            .findOneAndUpdate(
                { group_id: groupId, user_id: memberId },
                { role: newRole },
                { new: true },
            )
            .exec();
            
        if (!updatedMember) {
            throw new NotFoundException('Member not found');
        }

        // Notify member about role change
        const groupName = await this.getGroupName(groupId);
        const roleName = newRole === GroupMemberRole.MODERATOR ? 'Quản trị viên' : 'Thành viên';
        await this.notify(memberId, adminId, 'group_role',
            `Vai trò của bạn trong nhóm ${groupName} đã được thay đổi thành ${roleName}.`, groupId, 'group');
        
        return updatedMember;
    }

    // UC5.13: Transfer admin (admin only)
    async transferAdmin(groupId: string, currentAdminId: string, newAdminId: string): Promise<void> {
        const currentAdmin = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: currentAdminId, role: GroupMemberRole.ADMIN })
            .exec();
            
        if (!currentAdmin) {
            throw new ForbiddenException('Only admin can transfer admin role');
        }

        const newAdminMember = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: newAdminId, status: GroupMemberStatus.ACTIVE })
            .exec();
            
        if (!newAdminMember) {
            throw new NotFoundException('New admin must be an active member');
        }

        // Demote current admin to moderator
        await this.groupMemberModel
            .findByIdAndUpdate(currentAdmin._id, { role: GroupMemberRole.MODERATOR })
            .exec();
            
        // Promote new admin
        await this.groupMemberModel
            .findByIdAndUpdate(newAdminMember._id, { role: GroupMemberRole.ADMIN })
            .exec();

        // Notify new admin
        const groupName = await this.getGroupName(groupId);
        const currentAdminName = await this.getUserName(currentAdminId);
        await this.notify(newAdminId, currentAdminId, 'group_role',
            `${currentAdminName} đã chuyển quyền quản trị nhóm ${groupName} cho bạn.`, groupId, 'group');
    }

    // ============ GROUP POSTS (using unified Post model) ============

    // Create group post
    async createGroupPost(groupId: string, userId: string, postData: CreateGroupPostDto): Promise<Post> {
        const member = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: userId, status: GroupMemberStatus.ACTIVE })
            .exec();
            
        if (!member) {
            throw new ForbiddenException('Only active members can post');
        }

        const group = await this.groupModel.findById(groupId).exec();
        if (!group) {
            throw new NotFoundException('Group not found');
        }

        // Moderators and admins don't need approval
        const needsApproval = group.require_post_approval && member.role === GroupMemberRole.MEMBER;
        const status = needsApproval ? PostStatus.PENDING : PostStatus.APPROVED;

        const post = await this.postModel.create({
            ...postData,
            group_id: groupId,
            user_id: userId,
            visibility: 'public',
            status,
            likes_count: 0,
            comments_count: 0,
            shares_count: 0,
        });

        if (status === PostStatus.PENDING) {
            await this.groupModel
                .findByIdAndUpdate(groupId, { $inc: { pending_posts: 1 } })
                .exec();
            // Notify admins/mods about pending post
            const userName = await this.getUserName(userId);
            const groupName = await this.getGroupName(groupId);
            const admins = await this.groupMemberModel.find({
                group_id: groupId,
                role: { $in: [GroupMemberRole.ADMIN, GroupMemberRole.MODERATOR] },
                status: GroupMemberStatus.ACTIVE,
            }).exec();
            for (const admin of admins) {
                await this.notify(admin.user_id, userId, 'group_join',
                    `${userName} đã đăng bài mới trong nhóm ${groupName} và đang chờ duyệt.`, groupId, 'group');
            }
        }

        return post;
    }

    // Get approved group posts (for regular members)
    async getGroupPosts(groupId: string, userId?: string): Promise<any[]> {
        const posts = await this.postModel
            .find({ group_id: groupId, status: { $in: [PostStatus.APPROVED, PostStatus.ACTIVE] } })
            .sort({ created_at: -1 })
            .lean()
            .exec();
        return this.enrichGroupPostsWithUserInfo(posts, userId);
    }

    // Get all group posts with filter (for moderators/admins)
    async getAllGroupPosts(groupId: string, userId: string, status?: string): Promise<any[]> {
        const user = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: userId })
            .exec();
            
        if (!user || (user.role !== GroupMemberRole.MODERATOR && user.role !== GroupMemberRole.ADMIN)) {
            throw new ForbiddenException('Only moderators and admins can view all posts');
        }

        const query: any = { group_id: groupId };
        if (status) {
            query.status = status;
        }

        const posts = await this.postModel
            .find(query)
            .sort({ created_at: -1 })
            .lean()
            .exec();
        return this.enrichGroupPostsWithUserInfo(posts, userId);
    }

    private async enrichGroupPostsWithUserInfo(posts: any[], currentUserId?: string): Promise<any[]> {
        if (!posts || posts.length === 0) return [];

        const userIds = [...new Set(posts.map(p => p.user_id))];
        const users = await this.userModel
            .find({ _id: { $in: userIds } })
            .select('_id full_name username avatar_url')
            .lean()
            .exec();
        const userMap = new Map(users.map(u => [(u as any)._id.toString(), u]));

        let likedPostIds = new Set<string>();
        if (currentUserId) {
            const likes = await this.likeModel
                .find({
                    user_id: currentUserId,
                    post_id: { $in: posts.map(p => p._id.toString()) },
                })
                .lean()
                .exec();
            likedPostIds = new Set(likes.map((l: any) => l.post_id?.toString()));
        }

        return posts.map(post => {
            const user = userMap.get(post.user_id?.toString());
            return {
                ...post,
                user_name: (user as any)?.full_name || (user as any)?.username || 'Người dùng',
                username: (user as any)?.username || null,
                user_avatar: (user as any)?.avatar_url || null,
                is_liked: likedPostIds.has(post._id.toString()),
            };
        });
    }

    // Get pending posts
    async getPendingPosts(groupId: string, userId: string): Promise<Post[]> {
        const user = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: userId })
            .exec();
            
        if (!user || (user.role !== GroupMemberRole.MODERATOR && user.role !== GroupMemberRole.ADMIN)) {
            throw new ForbiddenException('Only moderators and admins can view pending posts');
        }

        return this.postModel
            .find({ group_id: groupId, status: PostStatus.PENDING })
            .sort({ created_at: -1 })
            .exec();
    }

    // UC5.6: Approve post (mod/admin)
    async approvePost(groupId: string, approverId: string, postId: string): Promise<Post> {
        const approver = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: approverId })
            .exec();
            
        if (!approver || (approver.role !== GroupMemberRole.MODERATOR && approver.role !== GroupMemberRole.ADMIN)) {
            throw new ForbiddenException('Only moderators and admins can approve posts');
        }

        const post = await this.postModel
            .findByIdAndUpdate(
                postId,
                { 
                    status: PostStatus.APPROVED, 
                    approved_by: approverId, 
                    approved_at: new Date() 
                },
                { new: true }
            )
            .exec();
            
        if (!post) {
            throw new NotFoundException('Post not found');
        }

        await this.groupModel
            .findByIdAndUpdate(groupId, { $inc: { pending_posts: -1 } })
            .exec();

        // Notify post author about approval
        const groupName = await this.getGroupName(groupId);
        await this.notify(post.user_id, approverId, 'group_join',
            `Bài viết của bạn trong nhóm ${groupName} đã được duyệt.`, groupId, 'group');
            
        return post;
    }

    // Reject post
    async rejectPost(groupId: string, rejecterId: string, postId: string, reason?: string): Promise<void> {
        const rejecter = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: rejecterId })
            .exec();
            
        if (!rejecter || (rejecter.role !== GroupMemberRole.MODERATOR && rejecter.role !== GroupMemberRole.ADMIN)) {
            throw new ForbiddenException('Only moderators and admins can reject posts');
        }

        const post = await this.postModel
            .findByIdAndUpdate(
                postId,
                { 
                    status: PostStatus.REJECTED, 
                    rejected_reason: reason,
                },
                { new: true }
            )
            .exec();
            
        if (!post) {
            throw new NotFoundException('Post not found');
        }

        await this.groupModel
            .findByIdAndUpdate(groupId, { $inc: { pending_posts: -1 } })
            .exec();

        // Notify post author about rejection
        const groupName = await this.getGroupName(groupId);
        const reasonText = reason ? ` Lý do: ${reason}` : '';
        await this.notify(post.user_id, rejecterId, 'group_join',
            `Bài viết của bạn trong nhóm ${groupName} đã bị từ chối.${reasonText}`, groupId, 'group');
    }

    // UC5.7: Delete post (mod/admin or post owner)
    async deletePost(groupId: string, deleterId: string, postId: string): Promise<void> {
        const deleter = await this.groupMemberModel
            .findOne({ group_id: groupId, user_id: deleterId })
            .exec();
            
        if (!deleter) {
            throw new ForbiddenException('You are not a member of this group');
        }

        const post = await this.postModel.findById(postId).exec();
        if (!post) {
            throw new NotFoundException('Post not found');
        }

        // Allow post owner or moderator/admin to delete
        const canDelete = post.user_id === deleterId || 
                          deleter.role === GroupMemberRole.MODERATOR || 
                          deleter.role === GroupMemberRole.ADMIN;

        if (!canDelete) {
            throw new ForbiddenException('You do not have permission to delete this post');
        }

        await this.postModel.findByIdAndDelete(postId).exec();

        if (post.status === PostStatus.PENDING) {
            await this.groupModel
                .findByIdAndUpdate(groupId, { $inc: { pending_posts: -1 } })
                .exec();
        }
    }
}
