class Post {
  final String? id;
  final String userId;
  final String? content;
  final List<String>? mediaUrls;
  final String? contentType;
  final String? status;
  final String? visibility; // 'public', 'friends', 'private'
  final int likesCount;
  final int commentsCount;
  final int sharesCount;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  
  // For display purposes
  final String? userName;
  final String? username;
  final String? userAvatar;
  final bool? isLiked;
  final String? groupId;
  final String? approvedBy;
  final DateTime? approvedAt;
  final String? rejectedReason;
  final List<String> tags;
  final bool isEdited;

  Post({
    this.id,
    required this.userId,
    this.content,
    this.mediaUrls,
    this.contentType,
    this.status,
    this.visibility = 'public',
    this.likesCount = 0,
    this.commentsCount = 0,
    this.sharesCount = 0,
    this.createdAt,
    this.updatedAt,
    this.userName,
    this.username,
    this.userAvatar,
    this.isLiked = false,
    this.groupId,
    this.approvedBy,
    this.approvedAt,
    this.rejectedReason,
    this.tags = const [],
    this.isEdited = false,
  });

  bool get isGroupPost => groupId != null && groupId!.isNotEmpty;

  factory Post.fromJson(Map<String, dynamic> json) {
    return Post(
      id: json['_id'] as String?,
      userId: json['user_id'] as String,
      content: json['content'] as String?,
      mediaUrls: json['media_urls'] != null 
          ? List<String>.from(json['media_urls']) 
          : null,
      contentType: json['content_type'] as String?,
      status: json['status'] as String?,
      visibility: json['visibility'] as String? ?? 'public',
      likesCount: json['likes_count'] as int? ?? 0,
      commentsCount: json['comments_count'] as int? ?? 0,
      sharesCount: json['shares_count'] as int? ?? 0,
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at']) 
          : null,
      updatedAt: json['updated_at'] != null 
          ? DateTime.parse(json['updated_at']) 
          : null,
      userName: json['user_name'] as String?,
      username: json['username'] as String?,
      userAvatar: json['user_avatar'] as String?,
      isLiked: json['is_liked'] as bool? ?? false,
      groupId: json['group_id']?.toString() ?? json['groupId']?.toString(),
      approvedBy: json['approved_by'] as String?,
      approvedAt: json['approved_at'] != null 
          ? DateTime.parse(json['approved_at']) 
          : null,
      rejectedReason: json['rejected_reason'] as String?,
      tags: json['tags'] != null
          ? List<String>.from(json['tags'])
          : [],
      isEdited: json['is_edited'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) '_id': id,
      'user_id': userId,
      if (content != null) 'content': content,
      if (mediaUrls != null) 'media_urls': mediaUrls,
      if (contentType != null) 'content_type': contentType,
      if (status != null) 'status': status,
      'visibility': visibility,
      'likes_count': likesCount,
      'comments_count': commentsCount,
      'shares_count': sharesCount,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
      if (updatedAt != null) 'updated_at': updatedAt!.toIso8601String(),
      if (groupId != null) 'group_id': groupId,
      if (tags.isNotEmpty) 'tags': tags,
    };
  }

  Post copyWith({
    String? id,
    String? userId,
    String? content,
    List<String>? mediaUrls,
    String? contentType,
    String? status,
    String? visibility,
    int? likesCount,
    int? commentsCount,
    int? sharesCount,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? userName,
    String? userAvatar,
    bool? isLiked,
    String? groupId,
    List<String>? tags,
    bool? isEdited,
  }) {
    return Post(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      content: content ?? this.content,
      mediaUrls: mediaUrls ?? this.mediaUrls,
      contentType: contentType ?? this.contentType,
      status: status ?? this.status,
      visibility: visibility ?? this.visibility,
      likesCount: likesCount ?? this.likesCount,
      commentsCount: commentsCount ?? this.commentsCount,
      sharesCount: sharesCount ?? this.sharesCount,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      userName: userName ?? this.userName,
      userAvatar: userAvatar ?? this.userAvatar,
      isLiked: isLiked ?? this.isLiked,
      groupId: groupId ?? this.groupId,
      tags: tags ?? this.tags,
      isEdited: isEdited ?? this.isEdited,
    );
  }
}
