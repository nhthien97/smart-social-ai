class MessageModel {
  final String id;
  final String convId;
  final String senderId;
  final String? content;
  final String messageType; // text, image, file, system, share_post
  final List<String> mediaUrls;
  final String? fileUrl;
  final String? fileName;
  final int? fileSize;
  final String? sharedPostId;
  final String? replyToId;
  final bool isEdited;
  final DateTime? editedAt;
  final bool isRecalled;
  final DateTime? recalledAt;
  final DateTime? createdAt;

  // Enriched fields
  final Map<String, dynamic>? senderInfo;
  final Map<String, dynamic>? replyToInfo;
  final Map<String, dynamic>? sharedPostInfo;

  MessageModel({
    required this.id,
    required this.convId,
    required this.senderId,
    this.content,
    this.messageType = 'text',
    this.mediaUrls = const [],
    this.fileUrl,
    this.fileName,
    this.fileSize,
    this.sharedPostId,
    this.replyToId,
    this.isEdited = false,
    this.editedAt,
    this.isRecalled = false,
    this.recalledAt,
    this.createdAt,
    this.senderInfo,
    this.replyToInfo,
    this.sharedPostInfo,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) {
    return MessageModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      convId: json['conv_id']?.toString() ?? '',
      senderId: json['sender_id']?.toString() ?? '',
      content: json['content'],
      messageType: json['message_type'] ?? 'text',
      mediaUrls: json['media_urls'] != null
          ? List<String>.from(json['media_urls'])
          : [],
      fileUrl: json['file_url'],
      fileName: json['file_name'],
      fileSize: json['file_size'],
      sharedPostId: json['shared_post_id']?.toString(),
      replyToId: json['reply_to_id']?.toString(),
      isEdited: json['is_edited'] ?? false,
      editedAt: json['edited_at'] != null
          ? DateTime.tryParse(json['edited_at'].toString())
          : null,
      isRecalled: json['is_recalled'] ?? false,
      recalledAt: json['recalled_at'] != null
          ? DateTime.tryParse(json['recalled_at'].toString())
          : null,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
      senderInfo: json['sender_info'] is Map
          ? Map<String, dynamic>.from(json['sender_info'])
          : null,
      // API and Firestore both use 'reply_to'; legacy field is 'reply_to_info'
      replyToInfo: json['reply_to'] is Map
          ? Map<String, dynamic>.from(json['reply_to'])
          : json['reply_to_info'] is Map
              ? Map<String, dynamic>.from(json['reply_to_info'])
              : null,
      sharedPostInfo: json['shared_post_info'] is Map
          ? Map<String, dynamic>.from(json['shared_post_info'])
          : null,
    );
  }

  /// Tên người gửi
  String get senderName {
    if (senderInfo != null) {
      return senderInfo!['full_name'] ?? senderInfo!['username'] ?? 'Ẩn danh';
    }
    return 'Ẩn danh';
  }

  String? get senderAvatar {
    return senderInfo?['avatar_url']?.toString();
  }

  /// Tên người gửi của tin nhắn được reply
  String get replyToSenderName {
    if (replyToInfo == null) return '';
    final si = replyToInfo!['sender_info'];
    if (si is Map) return si['full_name'] ?? si['username'] ?? 'Ẩn danh';
    return replyToInfo!['sender_name'] ?? replyToInfo!['from_name'] ?? 'Ẩn danh';
  }

  bool get isSystem => messageType == 'system';
  bool get isImage => messageType == 'image';
  bool get isFile => messageType == 'file';
  bool get isSharePost => messageType == 'share_post';
  bool get isText => messageType == 'text';

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'conv_id': convId,
      'sender_id': senderId,
      'content': content,
      'message_type': messageType,
      'media_urls': mediaUrls,
      'file_url': fileUrl,
      'file_name': fileName,
      'file_size': fileSize,
      'shared_post_id': sharedPostId,
      'reply_to_id': replyToId,
    };
  }

  MessageModel copyWith({
    String? id,
    String? convId,
    String? senderId,
    String? content,
    String? messageType,
    List<String>? mediaUrls,
    String? fileUrl,
    String? fileName,
    int? fileSize,
    String? sharedPostId,
    String? replyToId,
    bool? isEdited,
    DateTime? editedAt,
    bool? isRecalled,
    DateTime? recalledAt,
    DateTime? createdAt,
    Map<String, dynamic>? senderInfo,
    Map<String, dynamic>? replyToInfo,
    Map<String, dynamic>? sharedPostInfo,
  }) {
    return MessageModel(
      id: id ?? this.id,
      convId: convId ?? this.convId,
      senderId: senderId ?? this.senderId,
      content: content ?? this.content,
      messageType: messageType ?? this.messageType,
      mediaUrls: mediaUrls ?? this.mediaUrls,
      fileUrl: fileUrl ?? this.fileUrl,
      fileName: fileName ?? this.fileName,
      fileSize: fileSize ?? this.fileSize,
      sharedPostId: sharedPostId ?? this.sharedPostId,
      replyToId: replyToId ?? this.replyToId,
      isEdited: isEdited ?? this.isEdited,
      editedAt: editedAt ?? this.editedAt,
      isRecalled: isRecalled ?? this.isRecalled,
      recalledAt: recalledAt ?? this.recalledAt,
      createdAt: createdAt ?? this.createdAt,
      senderInfo: senderInfo ?? this.senderInfo,
      replyToInfo: replyToInfo ?? this.replyToInfo,
      sharedPostInfo: sharedPostInfo ?? this.sharedPostInfo,
    );
  }
}

class ParticipantModel {
  final String id;
  final String convId;
  final String userId;
  final String role; // leader, admin, member
  final String? nickname;
  final DateTime? joinedAt;
  final DateTime? leftAt;
  final bool isMuted;
  final String? blockedBy;

  // Enriched
  final Map<String, dynamic>? userInfo;

  ParticipantModel({
    required this.id,
    required this.convId,
    required this.userId,
    this.role = 'member',
    this.nickname,
    this.joinedAt,
    this.leftAt,
    this.isMuted = false,
    this.blockedBy,
    this.userInfo,
  });

  factory ParticipantModel.fromJson(Map<String, dynamic> json) {
    return ParticipantModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      convId: json['conv_id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? '',
      role: json['role'] ?? 'member',
      nickname: json['nickname'],
      joinedAt: json['joined_at'] != null
          ? DateTime.tryParse(json['joined_at'].toString())
          : null,
      leftAt: json['left_at'] != null
          ? DateTime.tryParse(json['left_at'].toString())
          : null,
      isMuted: json['is_muted'] ?? false,
      blockedBy: json['blocked_by']?.toString(),
      userInfo: json['user_info'] is Map
          ? Map<String, dynamic>.from(json['user_info'])
          : null,
    );
  }

  String get displayName {
    if (nickname != null && nickname!.isNotEmpty) return nickname!;
    if (userInfo != null) {
      return userInfo!['full_name'] ?? userInfo!['username'] ?? 'Người dùng';
    }
    return 'Người dùng';
  }

  String? get avatarUrl => userInfo?['avatar_url']?.toString();

  bool get isLeader => role == 'leader';
  bool get isAdmin => role == 'admin';
}
