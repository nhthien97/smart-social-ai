class ConversationModel {
  final String id;
  final String type; // 'private' or 'group'
  final String? name;
  final String? avatarUrl;
  final String creatorId;
  final String? lastMessageContent;
  final DateTime? lastMessageAt;
  final String? lastMessageSenderId;
  final int unreadCount;
  final DateTime? createdAt;

  // Enriched fields for private chat
  final Map<String, dynamic>? partnerInfo;
  // Enriched fields for group
  final int? memberCount;

  ConversationModel({
    required this.id,
    required this.type,
    this.name,
    this.avatarUrl,
    required this.creatorId,
    this.lastMessageContent,
    this.lastMessageAt,
    this.lastMessageSenderId,
    this.unreadCount = 0,
    this.createdAt,
    this.partnerInfo,
    this.memberCount,
  });

  factory ConversationModel.fromJson(Map<String, dynamic> json) {
    return ConversationModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      type: json['type'] ?? 'private',
      name: json['name'],
      avatarUrl: json['avatar_url'],
      creatorId: json['creator_id']?.toString() ?? '',
      lastMessageContent: json['last_message_content'],
      lastMessageAt: json['last_message_at'] != null
          ? DateTime.tryParse(json['last_message_at'].toString())
          : null,
      lastMessageSenderId: json['last_message_sender_id']?.toString(),
      unreadCount: json['unread_count'] ?? 0,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
      partnerInfo: json['partner_info'] is Map
          ? Map<String, dynamic>.from(json['partner_info'])
          : null,
      memberCount: json['member_count'],
    );
  }

  /// Tên hiển thị: private → tên bạn bè, group → tên nhóm
  String get displayName {
    if (type == 'private' && partnerInfo != null) {
      return partnerInfo!['full_name'] ?? partnerInfo!['username'] ?? 'Người dùng';
    }
    return name ?? 'Nhóm chat';
  }

  /// Avatar hiển thị
  String? get displayAvatar {
    if (type == 'private' && partnerInfo != null) {
      return partnerInfo!['avatar_url']?.toString();
    }
    return avatarUrl;
  }

  /// ID đối phương (chỉ cho private chat)
  String? get partnerId {
    if (type == 'private' && partnerInfo != null) {
      return partnerInfo!['_id']?.toString();
    }
    return null;
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'type': type,
      'name': name,
      'avatar_url': avatarUrl,
      'creator_id': creatorId,
      'last_message_content': lastMessageContent,
      'last_message_at': lastMessageAt?.toIso8601String(),
      'last_message_sender_id': lastMessageSenderId,
    };
  }

  ConversationModel copyWith({
    String? id,
    String? type,
    String? name,
    String? avatarUrl,
    String? creatorId,
    String? lastMessageContent,
    DateTime? lastMessageAt,
    String? lastMessageSenderId,
    int? unreadCount,
    DateTime? createdAt,
    Map<String, dynamic>? partnerInfo,
    int? memberCount,
  }) {
    return ConversationModel(
      id: id ?? this.id,
      type: type ?? this.type,
      name: name ?? this.name,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      creatorId: creatorId ?? this.creatorId,
      lastMessageContent: lastMessageContent ?? this.lastMessageContent,
      lastMessageAt: lastMessageAt ?? this.lastMessageAt,
      lastMessageSenderId: lastMessageSenderId ?? this.lastMessageSenderId,
      unreadCount: unreadCount ?? this.unreadCount,
      createdAt: createdAt ?? this.createdAt,
      partnerInfo: partnerInfo ?? this.partnerInfo,
      memberCount: memberCount ?? this.memberCount,
    );
  }
}
