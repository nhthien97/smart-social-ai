
import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../common/services/firebase.service';

@Injectable()
export class NotificationsService {
    constructor(
        private readonly firebaseService: FirebaseService,
    ) { }

    // Create a new notification (Firestore only)
    async create(data: {
        user_id: string;
        sender_id?: string;
        type: string;
        content: string;
        ref_id?: string;
        ref_type?: string;
    }) {
        return this.firebaseService.writeNotification(data);
    }

    // Get all notifications for a user (paginated) — reads from Firestore
    async findAllByUser(userId: string, page: number = 1, limit: number = 20) {
        return this.firebaseService.getNotifications(userId, page, limit);
    }

    // Get unread count for a user
    async getUnreadCount(userId: string): Promise<number> {
        return this.firebaseService.getUnreadCount(userId);
    }

    // Mark a single notification as read
    async markAsRead(notificationId: string, userId: string) {
        const success = await this.firebaseService.markNotificationRead(notificationId, userId);
        return { success };
    }

    // Mark all notifications as read for a user
    async markAllAsRead(userId: string) {
        return this.firebaseService.markAllNotificationsRead(userId);
    }

    // Delete a notification
    async delete(notificationId: string, userId: string) {
        const success = await this.firebaseService.deleteNotification(notificationId, userId);
        return { success };
    }
}
