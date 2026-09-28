// lib/providers/notification_provider.dart

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart' as fb_auth;
import '../config/firebase_config.dart' show isFirebaseInitialized;
import '../models/notification_model.dart';
import '../services/notification_service.dart';

class NotificationProvider extends ChangeNotifier {
  final NotificationService _notificationService = NotificationService();

  List<NotificationModel> _notifications = [];
  int _unreadCount = 0;
  bool _isLoading = false;
  String? _error;
  String? _currentUserId;
  StreamSubscription<QuerySnapshot>? _firestoreSubscription;

  List<NotificationModel> get notifications => _notifications;
  int get unreadCount => _unreadCount;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Bắt đầu lắng nghe Firestore notifications real-time
  void startListening(String userId) {
    if (_currentUserId == userId && _firestoreSubscription != null) return;

    _firestoreSubscription?.cancel();
    _currentUserId = userId;
    _isLoading = true;
    _error = null;
    notifyListeners();

    debugPrint('[NotifProvider] startListening for user: $userId');

    // Kiểm tra Firebase đã init và sign in chưa
    if (!isFirebaseInitialized) {
      debugPrint('[NotifProvider] Firebase not initialized, using REST API');
      _fallbackFetchFromApi();
      return;
    }

    final firebaseUser = fb_auth.FirebaseAuth.instance.currentUser;
    if (firebaseUser == null) {
      debugPrint('[NotifProvider] Firebase Auth not signed in, using REST API');
      _fallbackFetchFromApi();
      return;
    }

    debugPrint('[NotifProvider] Firebase Auth UID: ${firebaseUser.uid}');
    debugPrint('[NotifProvider] Starting Firestore listener...');

    _firestoreSubscription = FirebaseFirestore.instance
        .collection('notifications')
        .where('user_id', isEqualTo: userId)
        .limit(100)
        .snapshots()
        .listen(
      (snapshot) {
        debugPrint('[NotifProvider] Firestore: ${snapshot.docs.length} docs');
        _notifications = snapshot.docs.map((doc) {
          final data = doc.data();
          return NotificationModel(
            id: doc.id,
            firestoreId: doc.id,
            userId: data['user_id'] ?? '',
            senderId: data['sender_id'],
            type: data['type'] ?? '',
            content: data['content'] ?? '',
            refId: data['ref_id'],
            refType: data['ref_type'],
            isRead: data['is_read'] ?? false,
            createdAt: data['created_at'] != null
                ? (data['created_at'] as Timestamp).toDate()
                : DateTime.now(),
          );
        }).toList()
          ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

        _unreadCount = _notifications.where((n) => !n.isRead).length;
        _isLoading = false;
        _error = null;
        notifyListeners();
      },
      onError: (e) {
        debugPrint('[NotifProvider] Firestore ERROR: $e');
        _error = 'Không thể tải thông báo';
        _isLoading = false;
        notifyListeners();
        _fallbackFetchFromApi();
      },
    );
  }

  /// Fallback: lấy từ REST API nếu Firestore không khả dụng
  Future<void> _fallbackFetchFromApi() async {
    debugPrint('[NotifProvider] Fetching from REST API...');
    try {
      final response = await _notificationService.getNotifications(page: 1);
      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data;
        final List<dynamic> items = data['data'] ?? [];
        debugPrint('[NotifProvider] REST API: ${items.length} notifications');
        _notifications =
            items.map((json) => NotificationModel.fromJson(json)).toList();
        _unreadCount = _notifications.where((n) => !n.isRead).length;
        _isLoading = false;
        _error = null;
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[NotifProvider] REST API failed: $e');
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Dừng lắng nghe (gọi khi logout)
  void stopListening() {
    _firestoreSubscription?.cancel();
    _firestoreSubscription = null;
    _currentUserId = null;
    _notifications = [];
    _unreadCount = 0;
    notifyListeners();
  }

  /// Lấy số chưa đọc
  Future<void> fetchUnreadCount() async {
    if (_firestoreSubscription != null) return; // Đã tính từ stream
    try {
      final response = await _notificationService.getUnreadCount();
      if (response.statusCode == 200 || response.statusCode == 201) {
        _unreadCount = response.data['count'] ?? 0;
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error fetching unread count: $e');
    }
  }

  /// Fetch notifications (for compatibility)
  Future<void> fetchNotifications() async {
    if (_currentUserId != null && _firestoreSubscription != null) return;
    await _fallbackFetchFromApi();
  }

  /// Đánh dấu đã đọc 1 notification (qua REST API → Firestore sẽ tự update)
  Future<void> markAsRead(String notificationId) async {
    try {
      await _notificationService.markAsRead(notificationId);
      // Optimistic update
      final index = _notifications.indexWhere((n) => n.id == notificationId);
      if (index != -1 && !_notifications[index].isRead) {
        _notifications[index] = NotificationModel(
          id: _notifications[index].id,
          firestoreId: _notifications[index].firestoreId,
          userId: _notifications[index].userId,
          senderId: _notifications[index].senderId,
          type: _notifications[index].type,
          content: _notifications[index].content,
          refId: _notifications[index].refId,
          refType: _notifications[index].refType,
          isRead: true,
          createdAt: _notifications[index].createdAt,
        );
        _unreadCount = (_unreadCount - 1).clamp(0, double.maxFinite.toInt());
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error marking notification as read: $e');
    }
  }

  /// Đánh dấu tất cả đã đọc
  Future<void> markAllAsRead() async {
    try {
      await _notificationService.markAllAsRead();
      _notifications = _notifications.map((n) {
        return NotificationModel(
          id: n.id,
          firestoreId: n.firestoreId,
          userId: n.userId,
          senderId: n.senderId,
          type: n.type,
          content: n.content,
          refId: n.refId,
          refType: n.refType,
          isRead: true,
          createdAt: n.createdAt,
        );
      }).toList();
      _unreadCount = 0;
      notifyListeners();
    } catch (e) {
      debugPrint('Error marking all as read: $e');
    }
  }

  /// Xóa notification
  Future<void> deleteNotification(String notificationId) async {
    try {
      await _notificationService.deleteNotification(notificationId);
      final notification = _notifications.firstWhere(
        (n) => n.id == notificationId,
        orElse: () => _notifications.first,
      );
      if (!notification.isRead) {
        _unreadCount = (_unreadCount - 1).clamp(0, double.maxFinite.toInt());
      }
      _notifications.removeWhere((n) => n.id == notificationId);
      notifyListeners();
    } catch (e) {
      debugPrint('Error deleting notification: $e');
    }
  }

  @override
  void dispose() {
    _firestoreSubscription?.cancel();
    super.dispose();
  }
}
