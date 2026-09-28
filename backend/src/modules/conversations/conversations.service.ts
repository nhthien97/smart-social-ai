
import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationType } from './schemas/conversation.scheme';
import { ConversationParticipant, ParticipantRole } from '../conversation-participants/schemas/conversation-participants.scheme';
import { Friend } from '../friends/schemas/friend.scheme';
import { CreatePrivateConversationDto, CreateGroupConversationDto, UpdateConversationDto } from './dto/conversation.dto';
import { FirebaseService } from '../../common/services/firebase.service';

@Injectable()
export class ConversationsService {
    private readonly logger = new Logger(ConversationsService.name);

    constructor(
        @InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
        @InjectModel(ConversationParticipant.name) private participantModel: Model<ConversationParticipant>,
        @InjectModel('Friend') private friendModel: Model<Friend>,
        @InjectModel('User') private userModel: Model<any>,
        private readonly firebaseService: FirebaseService,
    ) { }

    // ── Tạo cuộc trò chuyện riêng (1-1) ───────────────────────────────────
    async createPrivate(dto: CreatePrivateConversationDto): Promise<any> {
        const creatorId = dto.creator_id!;
        // Kiểm tra đã bạn bè hoặc đã có conversation cũ
        const areFriends = await this.checkFriends(creatorId, dto.friend_id);
        const existingConv = await this.findExistingPrivate(creatorId, dto.friend_id);

        if (existingConv) {
            // Nếu đã có conversation trước đó (kể cả hủy kết bạn rồi), tái sử dụng
            return existingConv;
        }

        if (!areFriends) {
            throw new BadRequestException('Bạn chỉ có thể nhắn tin với bạn bè');
        }

        const conv = new this.conversationModel({
            type: ConversationType.PRIVATE,
            creator_id: creatorId,
        });
        const saved = await conv.save();

        // Thêm 2 thành viên
        const convId = saved._id.toString();
        await this.participantModel.insertMany([
            { conv_id: convId, user_id: creatorId, role: ParticipantRole.MEMBER, joined_at: new Date() },
            { conv_id: convId, user_id: dto.friend_id, role: ParticipantRole.MEMBER, joined_at: new Date() },
        ]);

        // Ghi metadata lên Firestore để Flutter subscribe realtime
        this.firebaseService.upsertChatConversation({
            convId,
            participantIds: [creatorId, dto.friend_id],
            type: ConversationType.PRIVATE,
        }).catch(() => {});

        return this.enrichConversation(saved, creatorId);
    }

    // ── Tạo nhóm chat ──────────────────────────────────────────────────────
    async createGroup(dto: CreateGroupConversationDto): Promise<any> {
        const creatorId = dto.creator_id!;
        const conv = new this.conversationModel({
            type: ConversationType.GROUP,
            name: dto.name,
            avatar_url: dto.avatar_url,
            creator_id: creatorId,
        });
        const saved = await conv.save();
        const convId = saved._id.toString();

        // Người tạo = leader
        const participants = [
            { conv_id: convId, user_id: creatorId, role: ParticipantRole.LEADER, joined_at: new Date() },
            ...dto.participant_ids
                .filter(id => id !== creatorId)
                .map(id => ({
                    conv_id: convId,
                    user_id: id,
                    role: ParticipantRole.MEMBER,
                    joined_at: new Date(),
                })),
        ];
        await this.participantModel.insertMany(participants);

        // Ghi metadata lên Firestore để Flutter subscribe realtime
        const allIds = [creatorId, ...dto.participant_ids.filter(id => id !== creatorId)];
        this.firebaseService.upsertChatConversation({
            convId,
            participantIds: allIds,
            type: ConversationType.GROUP,
            name: dto.name,
            avatarUrl: dto.avatar_url,
        }).catch(() => {});

        return this.enrichConversation(saved, creatorId);
    }

    // ── Danh sách cuộc trò chuyện của user ──────────────────────────────────
    async findByUser(userId: string): Promise<any[]> {
        // Lấy tất cả conv_id mà user tham gia (chưa rời)
        const parts = await this.participantModel
            .find({ user_id: userId, left_at: null })
            .select('conv_id')
            .lean()
            .exec();

        const convIds = parts.map(p => p.conv_id);
        if (convIds.length === 0) return [];

        const convs = await this.conversationModel
            .find({ _id: { $in: convIds } })
            .sort({ last_message_at: -1, updated_at: -1 })
            .lean()
            .exec();

        const enriched = await Promise.all(convs.map(c => this.enrichConversation(c, userId)));

        // Sync tất cả conversation lên Firestore (đảm bảo doc tồn tại để rules get() hoạt động)
        this.syncConversationsToFirestore(convIds).catch(() => {});

        return enriched;
    }

    // ── Sync batch conversations lên Firestore ────────────────────────────
    async syncConversationsToFirestore(convIds: string[]): Promise<void> {
        if (convIds.length === 0) return;

        // Lấy tất cả participants của các conv
        const allParts = await this.participantModel
            .find({ conv_id: { $in: convIds }, left_at: null })
            .select('conv_id user_id')
            .lean()
            .exec();

        this.logger.log(`[FirestoreSync] convIds=${JSON.stringify(convIds)}, found ${allParts.length} participants`);

        // Build map convId → participantIds[] (dùng cả string lẫn convId gốc làm key)
        const partMap = new Map<string, string[]>();
        for (const p of allParts) {
            const key = p.conv_id.toString();
            if (!partMap.has(key)) partMap.set(key, []);
            partMap.get(key)!.push(p.user_id.toString());
        }

        // Lấy thông tin conversation để sync type/name/avatar
        const convs = await this.conversationModel
            .find({ _id: { $in: convIds } })
            .select('_id type name avatar_url last_message_content last_message_at last_message_sender_id')
            .lean()
            .exec();

        for (const conv of convs) {
            const cid = conv._id.toString();
            const pIds = partMap.get(cid) ?? [];
            this.logger.log(`[FirestoreSync] conv=${cid}, participantIds=${JSON.stringify(pIds)}`);
            if (pIds.length === 0) {
                this.logger.warn(`[FirestoreSync] Skipping conv=${cid}: no participants found`);
                continue;
            }
            try {
                await this.firebaseService.upsertChatConversation({
                    convId: cid,
                    participantIds: pIds,
                    type: (conv as any).type ?? '',
                    name: (conv as any).name,
                    avatarUrl: (conv as any).avatar_url,
                    lastMessageContent: (conv as any).last_message_content,
                    lastMessageAt: (conv as any).last_message_at,
                    lastSenderId: (conv as any).last_message_sender_id,
                });
                this.logger.log(`[FirestoreSync] Successfully wrote chats/${cid} to Firestore`);
            } catch (error) {
                this.logger.error(`[FirestoreSync] Failed to write chats/${cid}:`, error?.message);
            }
        }
    }

    // ── Chi tiết conversation ───────────────────────────────────────────────
    async findById(convId: string, userId: string): Promise<any> {
        const conv = await this.conversationModel.findById(convId).lean().exec();
        if (!conv) throw new NotFoundException('Cuộc trò chuyện không tồn tại');

        // Kiểm tra user có trong conversation không
        const participant = await this.participantModel.findOne({
            conv_id: convId, user_id: userId, left_at: null,
        }).lean().exec();
        if (!participant) throw new ForbiddenException('Bạn không thuộc cuộc trò chuyện này');

        // Sync lên Firestore để đảm bảo chats/{convId} doc tồn tại cho rules
        this.syncConversationsToFirestore([convId]).catch(() => {});

        return this.enrichConversation(conv, userId);
    }

    // ── Sửa thông tin nhóm (tên, avatar) ───────────────────────────────────
    async updateGroup(convId: string, userId: string, dto: UpdateConversationDto): Promise<Conversation> {
        const conv = await this.conversationModel.findById(convId).exec();
        if (!conv) throw new NotFoundException('Cuộc trò chuyện không tồn tại');
        if (conv.type !== ConversationType.GROUP) throw new BadRequestException('Chỉ có thể sửa nhóm chat');

        // Kiểm tra quyền: leader hoặc admin
        await this.requireRole(convId, userId, [ParticipantRole.LEADER, ParticipantRole.ADMIN]);

        if (dto.name !== undefined) conv.name = dto.name;
        if (dto.avatar_url !== undefined) conv.avatar_url = dto.avatar_url;
        return conv.save();
    }

    // ── Xóa cuộc trò chuyện ────────────────────────────────────────────────
    async deleteConversation(convId: string, userId: string): Promise<void> {
        const conv = await this.conversationModel.findById(convId).exec();
        if (!conv) throw new NotFoundException('Cuộc trò chuyện không tồn tại');

        if (conv.type === ConversationType.GROUP) {
            // Nhóm: chỉ leader mới xóa
            await this.requireRole(convId, userId, [ParticipantRole.LEADER]);
        } else {
            // Private: bất kỳ ai trong cuộc trò chuyện
            const p = await this.participantModel.findOne({ conv_id: convId, user_id: userId }).exec();
            if (!p) throw new ForbiddenException('Bạn không thuộc cuộc trò chuyện này');
        }

        await this.conversationModel.findByIdAndDelete(convId).exec();
        await this.participantModel.deleteMany({ conv_id: convId }).exec();
        // Messages cũng xóa theo
        // (để MessagesService xử lý hoặc cascade ở đây)
    }

    // ── Cập nhật last message cache ─────────────────────────────────────────
    async updateLastMessage(convId: string, messageId: string, content: string, senderId: string): Promise<void> {
        const now = new Date();
        await this.conversationModel.findByIdAndUpdate(convId, {
            last_message_id: messageId,
            last_message_content: content,
            last_message_at: now,
            last_message_sender_id: senderId,
        }).exec();

        // Cập nhật Firestore để Flutter nhận real-time
        this.firebaseService.upsertChatConversation({
            convId,
            participantIds: [], // merge: true sẽ không ghi đè field này
            type: '',
            lastMessageContent: content,
            lastMessageAt: now,
            lastSenderId: senderId,
        }).catch(() => {});
    }

    // ── Đánh dấu đã đọc ────────────────────────────────────────────────────
    async markAsRead(convId: string, userId: string): Promise<void> {
        await this.participantModel.findOneAndUpdate(
            { conv_id: convId, user_id: userId, left_at: null },
            { last_read_at: new Date() },
        ).exec();
    }

    // ── Helper: kiểm tra bạn bè ────────────────────────────────────────────
    private async checkFriends(userId1: string, userId2: string): Promise<boolean> {
        const id1 = userId1.toString();
        const id2 = userId2.toString();
        const doc = await this.friendModel.findOne({
            status: 'accepted',
            $or: [
                { user_id_1: id1, user_id_2: id2 },
                { user_id_1: id2, user_id_2: id1 },
            ],
        }).exec();
        if (doc) return true;
        // Fallback: try ObjectId comparison in case IDs stored inconsistently
        try {
            const oid1 = new Types.ObjectId(id1);
            const oid2 = new Types.ObjectId(id2);
            const doc2 = await this.friendModel.findOne({
                status: 'accepted',
                $or: [
                    { user_id_1: oid1, user_id_2: oid2 },
                    { user_id_1: oid2, user_id_2: oid1 },
                    { user_id_1: oid1, user_id_2: id2 },
                    { user_id_1: oid2, user_id_2: id1 },
                    { user_id_1: id1, user_id_2: oid2 },
                    { user_id_1: id2, user_id_2: oid1 },
                ],
            }).exec();
            return !!doc2;
        } catch { return false; }
    }

    // ── Helper: tìm cuộc trò chuyện riêng đã tồn tại ───────────────────────
    private async findExistingPrivate(userId1: string, userId2: string): Promise<any | null> {
        const parts1 = await this.participantModel.find({ user_id: userId1 }).select('conv_id').lean().exec();
        const convIds1 = parts1.map(p => p.conv_id);

        if (convIds1.length === 0) return null;

        const parts2 = await this.participantModel.findOne({
            user_id: userId2,
            conv_id: { $in: convIds1 },
        }).lean().exec();

        if (!parts2) return null;

        const conv = await this.conversationModel.findOne({
            _id: parts2.conv_id,
            type: ConversationType.PRIVATE,
        }).lean().exec();

        return conv ? this.enrichConversation(conv, userId1) : null;
    }

    // ── Helper: kiểm tra vai trò ────────────────────────────────────────────
    async requireRole(convId: string, userId: string, allowedRoles: ParticipantRole[]): Promise<ConversationParticipant> {
        const p = await this.participantModel.findOne({
            conv_id: convId, user_id: userId, left_at: null,
        }).exec();
        if (!p) throw new ForbiddenException('Bạn không thuộc cuộc trò chuyện này');
        if (!allowedRoles.includes(p.role as ParticipantRole)) {
            throw new ForbiddenException('Bạn không có quyền thực hiện hành động này');
        }
        return p;
    }

    // ── Helper: enrich conversation với thông tin user + unread count ────────
    private async enrichConversation(conv: any, currentUserId: string): Promise<any> {
        const convId = (conv._id || conv.id).toString();

        // Lấy danh sách thành viên
        const participants = await this.participantModel
            .find({ conv_id: convId, left_at: null })
            .lean()
            .exec();

        const userIds = participants.map(p => p.user_id);
        // Convert string IDs to ObjectId for query (user._id is ObjectId)
        const objectIds = userIds
            .map(id => { try { return new Types.ObjectId(id.toString()); } catch { return null; } })
            .filter(id => id !== null);

        const users = await this.userModel
            .find({ _id: { $in: objectIds } })
            .select('_id full_name username avatar_url')
            .lean()
            .exec();

        const userMap = new Map(users.map(u => [(u as any)._id.toString(), u]));

        // Đối tác trong private chat
        let partner: any = null;
        if (conv.type === ConversationType.PRIVATE || conv.type === 'private') {
            const partnerId = userIds.find(id => id.toString() !== currentUserId.toString());
            partner = partnerId ? userMap.get(partnerId.toString()) : null;
        }

        // Unread count
        const myPart = participants.find(p => p.user_id.toString() === currentUserId.toString());

        return {
            ...conv,
            participants: participants.map(p => ({
                ...p,
                user_info: userMap.get(p.user_id.toString()) || null,
            })),
            partner_info: partner ? {
                _id: (partner as any)._id,
                full_name: (partner as any).full_name,
                username: (partner as any).username,
                avatar_url: (partner as any).avatar_url,
            } : null,
            member_count: participants.length,
        };
    }
}
