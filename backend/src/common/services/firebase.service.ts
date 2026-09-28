// src/common/services/firebase.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
    private readonly logger = new Logger(FirebaseService.name);
    private firestore: admin.firestore.Firestore;

    onModuleInit() {
        try {
            // Kiểm tra nếu đã khởi tạo
            if (admin.apps.length === 0) {
                const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
                if (serviceAccount) {
                    // Khởi tạo từ JSON service account trong env
                    const parsed = JSON.parse(serviceAccount);
                    admin.initializeApp({
                        credential: admin.credential.cert(parsed),
                    });
                } else {
                    // Fallback: dùng Application Default Credentials
                    admin.initializeApp({
                        credential: admin.credential.applicationDefault(),
                    });
                }
            }
            this.firestore = admin.firestore();
            this.logger.log('Firebase Admin initialized successfully');
        } catch (error) {
            this.logger.error('Firebase Admin initialization failed:', error.message);
        }
    }

    getFirestore(): admin.firestore.Firestore | null {
        return this.firestore || null;
    }

    // ==================== NOTIFICATION CRUD (Firestore only) ====================

    // Tạo notification mới vào Firestore
    async writeNotification(data: {
        user_id: string;
        sender_id?: string;
        type: string;
        content: string;
        ref_id?: string;
        ref_type?: string;
    }): Promise<string | null> {
        try {
            if (!this.firestore) return null;

            const docRef = await this.firestore
                .collection('notifications')
                .add({
                    user_id: data.user_id,
                    sender_id: data.sender_id || null,
                    type: data.type,
                    content: data.content,
                    ref_id: data.ref_id || null,
                    ref_type: data.ref_type || null,
                    is_read: false,
                    created_at: admin.firestore.FieldValue.serverTimestamp(),
                });
            return docRef.id;
        } catch (error) {
            this.logger.warn('Failed to write notification to Firestore:', error.message);
            return null;
        }
    }

    // Lấy notifications theo user_id (phân trang)
    async getNotifications(userId: string, page: number = 1, limit: number = 20) {
        try {
            if (!this.firestore) return { data: [], total: 0, page, limit, totalPages: 0 };

            // Lấy tổng số
            const countSnapshot = await this.firestore
                .collection('notifications')
                .where('user_id', '==', userId)
                .count()
                .get();
            const total = countSnapshot.data().count;

            // Lấy data phân trang
            let query = this.firestore
                .collection('notifications')
                .where('user_id', '==', userId)
                .orderBy('created_at', 'desc')
                .limit(limit);

            // Skip bằng cách lấy doc cuối của page trước
            if (page > 1) {
                const skipDocs = await this.firestore
                    .collection('notifications')
                    .where('user_id', '==', userId)
                    .orderBy('created_at', 'desc')
                    .limit((page - 1) * limit)
                    .get();
                if (!skipDocs.empty) {
                    const lastDoc = skipDocs.docs[skipDocs.docs.length - 1];
                    query = query.startAfter(lastDoc);
                }
            }

            const snapshot = await query.get();
            const data = snapshot.docs.map(doc => ({
                _id: doc.id,
                ...doc.data(),
                created_at: doc.data().created_at?.toDate?.() || new Date(),
            }));

            return {
                data,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };
        } catch (error) {
            this.logger.warn('Failed to get notifications from Firestore:', error.message);
            return { data: [], total: 0, page, limit, totalPages: 0 };
        }
    }

    // Đếm notification chưa đọc
    async getUnreadCount(userId: string): Promise<number> {
        try {
            if (!this.firestore) return 0;

            const snapshot = await this.firestore
                .collection('notifications')
                .where('user_id', '==', userId)
                .where('is_read', '==', false)
                .count()
                .get();
            return snapshot.data().count;
        } catch (error) {
            this.logger.warn('Failed to get unread count from Firestore:', error.message);
            return 0;
        }
    }

    // Đánh dấu 1 notification đã đọc (theo Firestore doc ID)
    async markNotificationRead(notificationId: string, userId: string): Promise<boolean> {
        try {
            if (!this.firestore) return false;

            const docRef = this.firestore.collection('notifications').doc(notificationId);
            const doc = await docRef.get();
            if (doc.exists && doc.data()?.user_id === userId) {
                await docRef.update({ is_read: true });
                return true;
            }
            return false;
        } catch (error) {
            this.logger.warn('Failed to mark notification read in Firestore:', error.message);
            return false;
        }
    }

    // Đánh dấu tất cả đọc
    async markAllNotificationsRead(userId: string) {
        try {
            if (!this.firestore) return;

            const snapshot = await this.firestore
                .collection('notifications')
                .where('user_id', '==', userId)
                .where('is_read', '==', false)
                .get();

            const batch = this.firestore.batch();
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, { is_read: true });
            });
            await batch.commit();
            return { modifiedCount: snapshot.size };
        } catch (error) {
            this.logger.warn('Failed to mark all read in Firestore:', error.message);
            return { modifiedCount: 0 };
        }
    }

    // Xóa notification (theo Firestore doc ID)
    async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
        try {
            if (!this.firestore) return false;

            const docRef = this.firestore.collection('notifications').doc(notificationId);
            const doc = await docRef.get();
            if (doc.exists && doc.data()?.user_id === userId) {
                await docRef.delete();
                return true;
            }
            return false;
        } catch (error) {
            this.logger.warn('Failed to delete notification from Firestore:', error.message);
            return false;
        }
    }

    // Tạo Firebase Custom Token để Flutter sign in Firebase Auth
    // Dùng MongoDB user ID làm Firebase UID → Firestore rules match user_id
    async createCustomToken(userId: string): Promise<string | null> {
        try {
            const token = await admin.auth().createCustomToken(userId);
            return token;
        } catch (error) {
            this.logger.warn('Failed to create Firebase custom token:', error.message);
            return null;
        }
    }

    // ==================== CHAT REALTIME (Firestore) ====================

    // Tạo/cập nhật metadata conversation trong Firestore (collection: chats)
    async upsertChatConversation(data: {
        convId: string;
        participantIds: string[];
        type: string;
        name?: string;
        avatarUrl?: string;
        lastMessageContent?: string;
        lastMessageAt?: Date;
        lastSenderId?: string;
    }): Promise<void> {
        try {
            if (!this.firestore) return;
            const ref = this.firestore.collection('chats').doc(data.convId);
            // Chỉ ghi các field có giá trị, tránh ghi đè participant_ids bằng []
            const payload: Record<string, any> = {
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
            };
            if (data.participantIds.length > 0) {
                payload['participant_ids'] = data.participantIds;
            }
            if (data.type) {
                payload['type'] = data.type;
            }
            if (data.name !== undefined) payload['name'] = data.name ?? null;
            if (data.avatarUrl !== undefined) payload['avatar_url'] = data.avatarUrl ?? null;
            if (data.lastMessageContent !== undefined) payload['last_message_content'] = data.lastMessageContent;
            if (data.lastMessageAt != null) {
                payload['last_message_at'] = admin.firestore.Timestamp.fromDate(data.lastMessageAt);
            }
            if (data.lastSenderId !== undefined) payload['last_sender_id'] = data.lastSenderId;
            await ref.set(payload, { merge: true });
        } catch (error) {
            this.logger.warn('Failed to upsert chat conversation in Firestore:', error.message);
        }
    }

    // Ghi tin nhắn vào Firestore chats/{convId}/messages/{msgId}
    async writeMessageToFirestore(data: {
        msgId: string;
        convId: string;
        senderId: string;
        senderInfo: any;
        content: string;
        messageType: string;
        participantIds: string[];  // denormalized cho Firestore rules
        mediaUrls?: string[];
        fileUrl?: string | null;
        fileName?: string | null;
        fileSize?: number;
        isRecalled?: boolean;
        replyToId?: string | null;
        replyTo?: any;
        sharedPostInfo?: any;
        createdAt?: Date;
    }): Promise<void> {
        try {
            if (!this.firestore) {
                this.logger.warn('[writeMessage] Firestore not initialized!');
                return;
            }
            this.logger.log(`[writeMessage] Writing chats/${data.convId}/messages/${data.msgId}`);
            const ref = this.firestore
                .collection('chats')
                .doc(data.convId)
                .collection('messages')
                .doc(data.msgId);
            await ref.set({
                _id: data.msgId,
                conv_id: data.convId,
                sender_id: data.senderId,
                sender_info: data.senderInfo ?? null,
                content: data.content,
                message_type: data.messageType,
                participant_ids: data.participantIds,
                media_urls: data.mediaUrls ?? [],
                file_url: data.fileUrl ?? null,
                file_name: data.fileName ?? null,
                file_size: data.fileSize ?? 0,
                is_recalled: data.isRecalled ?? false,
                reply_to_id: data.replyToId ?? null,
                reply_to: data.replyTo ?? null,
                shared_post_info: data.sharedPostInfo ?? null,
                created_at: data.createdAt
                    ? admin.firestore.Timestamp.fromDate(data.createdAt)
                    : admin.firestore.FieldValue.serverTimestamp(),
            });
            this.logger.log(`[writeMessage] Successfully wrote chats/${data.convId}/messages/${data.msgId}`);
        } catch (error) {
            this.logger.error(`[writeMessage] Failed chats/${data.convId}/messages/${data.msgId}:`, error.message);
        }
    }

    // Cập nhật tin nhắn trong Firestore (edit / recall)
    async updateFirestoreMessage(
        convId: string,
        msgId: string,
        updates: Record<string, any>,
    ): Promise<void> {
        try {
            if (!this.firestore) return;
            const ref = this.firestore
                .collection('chats')
                .doc(convId)
                .collection('messages')
                .doc(msgId);
            await ref.update(updates);
        } catch (error) {
            this.logger.warn('Failed to update message in Firestore:', error.message);
        }
    }
}
