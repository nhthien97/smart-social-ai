
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConversationParticipant, ParticipantRole } from './schemas/conversation-participants.scheme';
import { Conversation, ConversationType } from '../conversations/schemas/conversation.scheme';
import { Message, MessageType } from '../messages/schemas/messages.scheme';
import { AddParticipantDto, UpdateRoleDto, UpdateNicknameDto } from './dto/participant.dto';
import { FirebaseService } from '../../common/services/firebase.service';

@Injectable()
export class ConversationParticipantsService {
    constructor(
        @InjectModel(ConversationParticipant.name) private participantModel: Model<ConversationParticipant>,
        @InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
        @InjectModel(Message.name) private messageModel: Model<Message>,
        @InjectModel('User') private userModel: Model<any>,
        private readonly firebaseService: FirebaseService,
    ) { }

    // ── Lấy danh sách thành viên ───────────────────────────────────────────
    async getMembers(convId: string): Promise<any[]> {
        const participants = await this.participantModel
            .find({ conv_id: convId, left_at: null })
            .sort({ role: 1, joined_at: 1 })
            .lean()
            .exec();

        const userIds = participants.map(p => p.user_id);
        const users = await this.userModel
            .find({ _id: { $in: userIds } })
            .select('_id full_name username avatar_url')
            .lean()
            .exec();

        const userMap = new Map(users.map(u => [(u as any)._id.toString(), u]));

        return participants.map(p => ({
            ...p,
            user_info: userMap.get(p.user_id) || null,
        }));
    }

    // ── Thêm thành viên vào nhóm ───────────────────────────────────────────
    // UC4.6: Mời thêm người vào nhóm chat – bất kỳ thành viên nào đều có thể mời
    async addMember(convId: string, addedByUserId: string, targetUserId: string): Promise<any> {
        const conv = await this.conversationModel.findById(convId).exec();
        if (!conv) throw new NotFoundException('Nhóm chat không tồn tại');
        if (conv.type !== ConversationType.GROUP) throw new BadRequestException('Chỉ thêm thành viên vào nhóm chat');

        // UC4.6: Bất kỳ thành viên nào đều có thể mời (không phân biệt role)
        const inviter = await this.participantModel.findOne({
            conv_id: convId, user_id: addedByUserId, left_at: null,
        }).exec();
        if (!inviter) throw new ForbiddenException('Bạn không thuộc cuộc trò chuyện này');

        // Kiểm tra đã trong nhóm chưa
        const existing = await this.participantModel.findOne({
            conv_id: convId, user_id: targetUserId, left_at: null,
        }).exec();
        if (existing) throw new BadRequestException('Người dùng đã trong nhóm');

        // Nếu từng rời nhóm, reset lại
        const leftBefore = await this.participantModel.findOne({
            conv_id: convId, user_id: targetUserId, left_at: { $ne: null },
        }).exec();

        let participant;
        if (leftBefore) {
            leftBefore.left_at = null as any;
            leftBefore.role = ParticipantRole.MEMBER;
            leftBefore.joined_at = new Date();
            participant = await leftBefore.save();
        } else {
            participant = await new this.participantModel({
                conv_id: convId,
                user_id: targetUserId,
                role: ParticipantRole.MEMBER,
                joined_at: new Date(),
            }).save();
        }

        // Tạo system message
        const addedUser = await this.userModel.findById(targetUserId).select('full_name username').lean().exec();
        const addedByUser = await this.userModel.findById(addedByUserId).select('full_name username').lean().exec();
        await new this.messageModel({
            conv_id: convId,
            sender_id: addedByUserId,
            content: `${(addedByUser as any)?.full_name || ''} đã thêm ${(addedUser as any)?.full_name || ''} vào nhóm`,
            message_type: MessageType.SYSTEM,
        }).save();

        // Notification cho người được thêm
        try {
            await this.firebaseService.writeNotification({
                user_id: targetUserId,
                sender_id: addedByUserId,
                type: 'group_join',
                content: `Bạn đã được thêm vào nhóm "${conv.name}"`,
                ref_id: convId,
                ref_type: 'conversation',
            });
        } catch {}

        return participant;
    }

    // ── Xóa thành viên khỏi nhóm ───────────────────────────────────────────
    async removeMember(convId: string, removedByUserId: string, targetUserId: string): Promise<void> {
        const conv = await this.conversationModel.findById(convId).exec();
        if (!conv || conv.type !== ConversationType.GROUP) throw new BadRequestException('Không hợp lệ');

        // Kiểm tra quyền
        const remover = await this.requireRole(convId, removedByUserId, [ParticipantRole.LEADER, ParticipantRole.ADMIN]);
        const target = await this.participantModel.findOne({
            conv_id: convId, user_id: targetUserId, left_at: null,
        }).exec();
        if (!target) throw new NotFoundException('Thành viên không tồn tại');

        // Không thể xóa leader
        if (target.role === ParticipantRole.LEADER) throw new ForbiddenException('Không thể xóa nhóm trưởng');
        // Admin chỉ bị leader xóa
        if (target.role === ParticipantRole.ADMIN && remover.role !== ParticipantRole.LEADER) {
            throw new ForbiddenException('Chỉ nhóm trưởng mới có thể xóa quản trị viên');
        }

        target.left_at = new Date();
        await target.save();

        // System message
        const removedUser = await this.userModel.findById(targetUserId).select('full_name').lean().exec();
        await new this.messageModel({
            conv_id: convId,
            sender_id: removedByUserId,
            content: `${(removedUser as any)?.full_name || ''} đã bị xóa khỏi nhóm`,
            message_type: MessageType.SYSTEM,
        }).save();
    }

    // ── Rời nhóm ───────────────────────────────────────────────────────────
    async leaveGroup(convId: string, userId: string): Promise<void> {
        const conv = await this.conversationModel.findById(convId).exec();
        if (!conv || conv.type !== ConversationType.GROUP) throw new BadRequestException('Không hợp lệ');

        const participant = await this.participantModel.findOne({
            conv_id: convId, user_id: userId, left_at: null,
        }).exec();
        if (!participant) throw new NotFoundException('Bạn không có trong nhóm');

        // Nếu là leader → phải chuyển quyền trước
        if (participant.role === ParticipantRole.LEADER) {
            throw new BadRequestException('Nhóm trưởng phải chuyển quyền trước khi rời nhóm');
        }

        participant.left_at = new Date();
        await participant.save();

        const user = await this.userModel.findById(userId).select('full_name').lean().exec();
        await new this.messageModel({
            conv_id: convId,
            sender_id: userId,
            content: `${(user as any)?.full_name || ''} đã rời nhóm`,
            message_type: MessageType.SYSTEM,
        }).save();
    }

    // ── Chỉ định QTV ───────────────────────────────────────────────────────
    async updateRole(convId: string, updatedByUserId: string, targetUserId: string, dto: UpdateRoleDto): Promise<any> {
        const conv = await this.conversationModel.findById(convId).exec();
        if (!conv || conv.type !== ConversationType.GROUP) throw new BadRequestException('Không hợp lệ');

        // Chỉ leader mới đổi role
        await this.requireRole(convId, updatedByUserId, [ParticipantRole.LEADER]);

        const target = await this.participantModel.findOne({
            conv_id: convId, user_id: targetUserId, left_at: null,
        }).exec();
        if (!target) throw new NotFoundException('Thành viên không tồn tại');

        // Không thể chỉ định leader thêm (chỉ chuyển quyền)
        if (dto.role === ParticipantRole.LEADER) {
            throw new BadRequestException('Dùng API chuyển quyền thay vì đổi role');
        }

        target.role = dto.role;
        return target.save();
    }

    // ── Chuyển quyền nhóm trưởng ───────────────────────────────────────────
    async transferLeadership(convId: string, currentLeaderId: string, newLeaderId: string): Promise<void> {
        await this.requireRole(convId, currentLeaderId, [ParticipantRole.LEADER]);

        const newLeader = await this.participantModel.findOne({
            conv_id: convId, user_id: newLeaderId, left_at: null,
        }).exec();
        if (!newLeader) throw new NotFoundException('User không có trong nhóm');

        // Hạ cấp leader cũ
        await this.participantModel.findOneAndUpdate(
            { conv_id: convId, user_id: currentLeaderId, left_at: null },
            { role: ParticipantRole.ADMIN },
        ).exec();

        // Nâng cấp leader mới
        newLeader.role = ParticipantRole.LEADER;
        await newLeader.save();

        // System message
        const oldUser = await this.userModel.findById(currentLeaderId).select('full_name').lean().exec();
        const newUser = await this.userModel.findById(newLeaderId).select('full_name').lean().exec();
        await new this.messageModel({
            conv_id: convId,
            sender_id: currentLeaderId,
            content: `${(oldUser as any)?.full_name} đã chuyển quyền nhóm trưởng cho ${(newUser as any)?.full_name}`,
            message_type: MessageType.SYSTEM,
        }).save();
    }

    // ── Đổi biệt danh ──────────────────────────────────────────────────────
    async updateNickname(convId: string, userId: string, dto: UpdateNicknameDto): Promise<any> {
        const p = await this.participantModel.findOne({
            conv_id: convId, user_id: userId, left_at: null,
        }).exec();
        if (!p) throw new NotFoundException('Không tìm thấy thành viên');

        p.nickname = (dto.nickname || null) as any;
        return p.save();
    }

    // ── Chặn người dùng trong chat riêng (UC4.12) ───────────────────────────
    // Khi chặn: đánh dấu blocked_by trên participant của đối phương
    // → đối phương không gửi tin được, nhưng lịch sử vẫn còn
    async blockUser(convId: string, blockerUserId: string): Promise<void> {
        const conv = await this.conversationModel.findById(convId).exec();
        if (!conv || conv.type !== ConversationType.PRIVATE) {
            throw new BadRequestException('Chỉ áp dụng cho chat riêng');
        }

        // Kiểm tra người chặn có trong conversation không
        const blockerParticipant = await this.participantModel.findOne({
            conv_id: convId, user_id: blockerUserId, left_at: null,
        }).exec();
        if (!blockerParticipant) throw new ForbiddenException('Bạn không thuộc cuộc trò chuyện này');

        // Tìm participant của đối phương
        const otherParticipant = await this.participantModel.findOne({
            conv_id: convId,
            user_id: { $ne: blockerUserId },
        }).exec();
        if (!otherParticipant) throw new NotFoundException('Không tìm thấy đối phương');

        // Đánh dấu đối phương bị chặn bởi blockerUserId
        otherParticipant.blocked_by = blockerUserId;
        await otherParticipant.save();
    }

    // ── Bỏ chặn người dùng (UC4.13) ─────────────────────────────────────────
    async unblockUser(convId: string, unblockerUserId: string): Promise<void> {
        const conv = await this.conversationModel.findById(convId).exec();
        if (!conv || conv.type !== ConversationType.PRIVATE) {
            throw new BadRequestException('Chỉ áp dụng cho chat riêng');
        }

        // Tìm participant của đối phương (người bị chặn)
        const otherParticipant = await this.participantModel.findOne({
            conv_id: convId,
            user_id: { $ne: unblockerUserId },
        }).exec();
        if (!otherParticipant) throw new NotFoundException('Không tìm thấy đối phương');

        // Kiểm tra xem người gọi có phải là người đã chặn không
        if (otherParticipant.blocked_by !== unblockerUserId) {
            throw new ForbiddenException('Bạn chưa chặn người này');
        }

        otherParticipant.blocked_by = null as any;
        await otherParticipant.save();
    }

    // ── Xóa lịch sử chat phía mình (UC) ─────────────────────────────────────
    async clearHistory(convId: string, userId: string): Promise<void> {
        const p = await this.participantModel.findOne({
            conv_id: convId, user_id: userId, left_at: null,
        }).exec();
        if (!p) throw new ForbiddenException('Bạn không thuộc cuộc trò chuyện này');

        p.history_cleared_at = new Date();
        await p.save();
    }

    // ── Helper: kiểm tra vai trò ────────────────────────────────────────────
    private async requireRole(convId: string, userId: string, allowed: ParticipantRole[]): Promise<ConversationParticipant> {
        const p = await this.participantModel.findOne({
            conv_id: convId, user_id: userId, left_at: null,
        }).exec();
        if (!p) throw new ForbiddenException('Bạn không thuộc nhóm này');
        if (!allowed.includes(p.role as ParticipantRole)) {
            throw new ForbiddenException('Bạn không có quyền thực hiện hành động này');
        }
        return p;
    }
}
