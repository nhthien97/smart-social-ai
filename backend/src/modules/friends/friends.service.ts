
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Friend, FriendDocument } from './schemas/friend.scheme';
import { UsersService } from '../users/users.service';
import { FirebaseService } from '../../common/services/firebase.service';

@Injectable()
export class FriendsService {
    private readonly logger = new Logger(FriendsService.name);

    constructor(
        @InjectModel(Friend.name) private friendModel: Model<FriendDocument>,
        private readonly usersService: UsersService,
        private readonly firebaseService: FirebaseService,
    ) {}

    // List accepted friends for a user
    async getFriends(userId: string) {
        const uid = userId.toString();
        const docs = await this.friendModel
            .find({
                status: 'accepted',
                $or: [{ user_id_1: uid }, { user_id_2: uid }],
            })
            .exec();

        // Build adjacency map to compute mutual friend counts
        const allAccepted = await this.friendModel.find({ status: 'accepted' }).exec();
        const adjacency = new Map<string, Set<string>>();
        const addEdge = (a: any, b: any) => {
            const as = a.toString();
            const bs = b.toString();
            if (!adjacency.has(as)) adjacency.set(as, new Set());
            adjacency.get(as)!.add(bs);
        };
        allAccepted.forEach((d) => {
            addEdge(d.user_id_1, d.user_id_2);
            addEdge(d.user_id_2, d.user_id_1);
        });
        const userFriends = adjacency.get(uid) || new Set<string>();

        const seen = new Set<string>();
        const results: any[] = [];

        for (const d of docs) {
            const otherId = d.user_id_1.toString() === uid ? d.user_id_2.toString() : d.user_id_1.toString();
            if (seen.has(otherId)) continue; // deduplicate
            seen.add(otherId);
            try {
                const user = await this.usersService.findById(otherId);
                const otherFriends = adjacency.get(otherId) || new Set<string>();
                let mutualCount = 0;
                userFriends.forEach((f) => { if (otherFriends.has(f)) mutualCount++; });
                results.push({
                    id: user._id,
                    fullName: (user as any).full_name || (user as any).fullName || (user as any).username,
                    avatar: (user as any).avatar_url || (user as any).avatar,
                    avatar_url: (user as any).avatar_url || (user as any).avatar,
                    username: (user as any).username,
                    mutualCount,
                });
            } catch (e) {
                this.logger.warn(`Could not load user ${otherId}: ${e}`);
            }
        }

        return results;
    }

    // Get incoming friend requests for a user
    async getRequests(userId: string) {
        const docs = await this.friendModel.find({ status: 'pending', user_id_2: userId }).exec();

        const results = await Promise.all(
            docs.map(async (d) => {
                try {
                    const from = await this.usersService.findById(d.user_id_1);
                    return {
                        requestId: d._id,
                        fromId: d.user_id_1,
                        fromName: (from as any).full_name || (from as any).username,
                        avatar: (from as any).avatar || (from as any).avatar_url,
                    };
                } catch (e) {
                    return { requestId: d._id, fromId: d.user_id_1 };
                }
            }),
        );

        return results;
    }

    // Check friendship status between two users
    async checkFriendship(currentUserId: string, otherUserId: string) {
        const doc = await this.friendModel
            .findOne({
                $or: [
                    { user_id_1: currentUserId, user_id_2: otherUserId },
                    { user_id_1: otherUserId, user_id_2: currentUserId },
                ],
            })
            .exec();

        if (!doc) return { status: 'none' };

        if (doc.status === 'accepted') return { status: 'friends', friendId: doc._id };

        if (doc.status === 'pending') {
            // Use action_user_id (the sender) for reliable determination
            const senderId = (doc.action_user_id || doc.user_id_1)?.toString();
            const isSender = senderId === currentUserId?.toString();
            return {
                status: isSender ? 'request_sent' : 'request_received',
                requestId: doc._id,
            };
        }

        return { status: 'none' };
    }

    // Return simple suggestions (users that are not friends and not the same user)
    async getSuggestions(userId: string, limit = 50) {
        // Build adjacency map of accepted friendships so we can compute mutual counts.
        const uid = userId.toString();

        const allAccepted = await this.friendModel.find({ status: 'accepted' }).exec();

        const adjacency = new Map<string, Set<string>>();
        const addEdge = (a: any, b: any) => {
            const as = a.toString();
            const bs = b.toString();
            if (!adjacency.has(as)) adjacency.set(as, new Set());
            adjacency.get(as)!.add(bs);
        };

        allAccepted.forEach((d) => {
            addEdge(d.user_id_1, d.user_id_2);
            addEdge(d.user_id_2, d.user_id_1);
        });

        // Set of current user's friends
        const userFriends = adjacency.get(uid) || new Set<string>();

        // Also collect users with pending requests (either direction) to exclude them
        const pendingDocs = await this.friendModel.find({
            status: 'pending',
            $or: [{ user_id_1: uid }, { user_id_2: uid }],
        }).exec();
        const pendingIds = new Set<string>(
            pendingDocs.map((d) => {
                const u1 = d.user_id_1.toString();
                const u2 = d.user_id_2.toString();
                return u1 === uid ? u2 : u1;
            }),
        );

        // fetch all users and exclude self, existing friends, and pending requests
        const allUsers = await this.usersService.findAll();

        const candidates = (allUsers as any[])
            .filter((u) => {
                const id = u._id.toString();
                // loại bỏ: chính mình, bạn hiện tại, đang pending, user bị khóa
                return (
                    id !== uid &&
                    !userFriends.has(id) &&
                    !pendingIds.has(id) &&
                    (u.status ?? 'ACTIVE') !== 'BLOCKED'
                );
            })
            .map((u) => {
                const id = u._id.toString();
                const theirFriends = adjacency.get(id) || new Set<string>();
                // mutual = intersection size between user's friends and candidate's friends
                let mutual = 0;
                userFriends.forEach((f) => {
                    if (theirFriends.has(f)) mutual += 1;
                });
                return {
                    id: u._id,
                    fullName: u.full_name || u.username,
                    avatar: u.avatar || u.avatar_url,
                    mutualCount: mutual,
                };
            })
            .sort((a, b) => b.mutualCount - a.mutualCount)
            .slice(0, limit);

        return candidates;
    }

    // Send friend request
    async sendRequest(fromUserId: string, toUserId: string) {
        if (fromUserId === toUserId) throw new BadRequestException('Cannot send request to yourself');

        // Check existing relationship
        const exists = await this.friendModel
            .findOne({
                $or: [
                    { user_id_1: fromUserId, user_id_2: toUserId },
                    { user_id_1: toUserId, user_id_2: fromUserId },
                ],
            })
            .exec();

        if (exists) {
            if (exists.status === 'pending') throw new BadRequestException('Request already pending');
            if (exists.status === 'accepted') throw new BadRequestException('Already friends');
        }

        const created = new this.friendModel({ user_id_1: fromUserId, user_id_2: toUserId, status: 'pending', action_user_id: fromUserId });
        await created.save();

        // Notify recipient about friend request
        try {
            const sender = await this.usersService.findById(fromUserId);
            const senderName = (sender as any).full_name || (sender as any).username || 'Ai đó';
            await this.firebaseService.writeNotification({
                user_id: toUserId, sender_id: fromUserId,
                type: 'friend_request', content: `${senderName} đã gửi lời mời kết bạn cho bạn.`,
                ref_id: created._id.toString(), ref_type: 'friend',
            });
        } catch (e) {}

        return { message: 'Request sent', id: created._id };
    }

    // Accept friend request
    async acceptRequest(userId: string, requestId: string) {
        const doc = await this.friendModel.findById(requestId).exec();
        if (!doc) throw new NotFoundException('Request not found');

        // Determine recipient based on action_user_id (creator/sender)
        const actionId = doc.action_user_id ? doc.action_user_id.toString() : null;
        const u1 = doc.user_id_1 ? doc.user_id_1.toString() : null;
        const u2 = doc.user_id_2 ? doc.user_id_2.toString() : null;

        const recipient = actionId && u1 === actionId ? u2 : u1;
        if (!recipient || recipient !== userId.toString()) throw new BadRequestException('Not authorized to accept');

        doc.status = 'accepted';
        doc.action_user_id = userId;
        await doc.save();

        // Notify the original sender that request was accepted
        try {
            const senderId = actionId === u1 ? u1 : u2;
            const acceptor = await this.usersService.findById(userId);
            const acceptorName = (acceptor as any).full_name || (acceptor as any).username || 'Ai đó';
            if (senderId && senderId !== userId) {
                await this.firebaseService.writeNotification({
                    user_id: senderId, sender_id: userId,
                    type: 'friend_accepted', content: `${acceptorName} đã chấp nhận lời mời kết bạn của bạn.`,
                    ref_id: requestId, ref_type: 'friend',
                });
            }
        } catch (e) {}

        return { message: 'Accepted' };
    }

    // Reject friend request
    async rejectRequest(userId: string, requestId: string) {
        const doc = await this.friendModel.findById(requestId).exec();
        if (!doc) throw new NotFoundException('Request not found');

        const actionId = doc.action_user_id ? doc.action_user_id.toString() : null;
        const u1 = doc.user_id_1 ? doc.user_id_1.toString() : null;
        const u2 = doc.user_id_2 ? doc.user_id_2.toString() : null;

        const recipient = actionId && u1 === actionId ? u2 : u1;
        if (!recipient || recipient !== userId.toString()) throw new BadRequestException('Not authorized to reject');

        doc.status = 'rejected';
        doc.action_user_id = userId;
        await doc.save();
        return { message: 'Rejected' };
    }

    // Remove friend (unfriend)
    async removeFriend(userId: string, friendId: string) {
        const doc = await this.friendModel
            .findOneAndDelete({
                status: 'accepted',
                $or: [
                    { user_id_1: userId, user_id_2: friendId },
                    { user_id_1: friendId, user_id_2: userId },
                ],
            })
            .exec();

        if (!doc) throw new NotFoundException('Friend relationship not found');
        return { message: 'Removed' };
    }

    // Get sent (outgoing) pending requests for a user
    async getSentRequests(userId: string) {
        const docs = await this.friendModel
            .find({ status: 'pending', user_id_1: userId })
            .exec();
        const results = await Promise.all(
            docs.map(async (d) => {
                try {
                    const to = await this.usersService.findById(d.user_id_2);
                    return {
                        requestId: d._id,
                        toId: d.user_id_2,
                        toName: (to as any).full_name || (to as any).username,
                        avatar: (to as any).avatar || (to as any).avatar_url,
                    };
                } catch (e) {
                    return { requestId: d._id, toId: d.user_id_2 };
                }
            }),
        );
        return results;
    }

    // Cancel a sent pending request
    async cancelSentRequest(userId: string, requestId: string) {
        const doc = await this.friendModel
            .findOneAndDelete({ _id: requestId, status: 'pending', user_id_1: userId })
            .exec();
        if (!doc) throw new NotFoundException('Request not found or not authorized');
        return { message: 'Cancelled' };
    }
}
