// lib/services/notification_service.dart

import 'package:dio/dio.dart';
import 'api_service.dart';

class NotificationService {
  final ApiService _apiService = ApiService();

  // Get notifications for current user
  Future<Response> getNotifications({int page = 1, int limit = 20}) async {
    return await _apiService.get(
      '/notifications',
      queryParameters: {'page': page.toString(), 'limit': limit.toString()},
    );
  }

  // Get unread notification count
  Future<Response> getUnreadCount() async {
    return await _apiService.get('/notifications/unread-count');
  }

  // Mark a single notification as read
  Future<Response> markAsRead(String notificationId) async {
    return await _apiService.put('/notifications/$notificationId/read');
  }

  // Mark all notifications as read
  Future<Response> markAllAsRead() async {
    return await _apiService.put('/notifications/read-all');
  }

  // Delete a notification
  Future<Response> deleteNotification(String notificationId) async {
    return await _apiService.delete('/notifications/$notificationId');
  }
}
