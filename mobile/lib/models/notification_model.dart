// lib/models/notification_model.dart

class NotificationModel {
  final String id;
  final String? firestoreId;
  final String userId;
  final String? senderId;
  final String type;
  final String content;
  final String? refId;
  final String? refType;
  final bool isRead;
  final DateTime createdAt;

  NotificationModel({
    required this.id,
    this.firestoreId,
    required this.userId,
    this.senderId,
    required this.type,
    required this.content,
    this.refId,
    this.refType,
    required this.isRead,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['_id'] ?? '',
      userId: json['user_id'] ?? '',
      senderId: json['sender_id'],
      type: json['type'] ?? '',
      content: json['content'] ?? '',
      refId: json['ref_id'],
      refType: json['ref_type'],
      isRead: json['is_read'] ?? false,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now(),
    );
  }

  // Icon and color based on notification type
  String get iconName {
    switch (type) {
      case 'warning':
        return 'warning';
      case 'flagged':
        return 'flag';
      case 'blocked':
        return 'block';
      case 'post_hidden':
        return 'visibility_off';
      case 'post_removed':
        return 'delete';
      case 'like':
        return 'favorite';
      case 'comment':
        return 'comment';
      case 'friend_request':
        return 'person_add';
      case 'friend_accepted':
        return 'people';
      case 'group_invite':
        return 'group_add';
      case 'group_join':
        return 'group';
      case 'group_role':
        return 'admin_panel_settings';
      default:
        return 'notifications';
    }
  }
}
