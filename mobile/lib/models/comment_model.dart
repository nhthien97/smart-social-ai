class Comment {
  final String? id;
  final String userId;
  final String postId;
  final String? parentId;
  final String content;
  final int likesCount;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  final String? userName;
  final String? username;
  final String? userAvatar;
  final bool? isLiked;
  final List<Comment>? replies;

  Comment({
    this.id,
    required this.userId,
    required this.postId,
    this.parentId,
    required this.content,
    this.likesCount = 0,
    this.createdAt,
    this.updatedAt,
    this.userName,
    this.username,
    this.userAvatar,
    this.isLiked = false,
    this.replies,
  });

  factory Comment.fromJson(Map<String, dynamic> json) {

    return Comment(
      id: json['_id'] as String?,
      userId: json['user_id'] as String,
      postId: json['post_id'] as String,
      parentId: json['parent_id'] as String?,
      content: json['content'] as String,
      likesCount: json['likes_count'] as int? ?? 0,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'])
          : null,
      userName: json['user_name'] as String?,
      username: json['username'] as String? ??
          json['user']?['username'] as String? ??
          json['author_username'] as String? ??
          json['user_name'] as String?,
      userAvatar: json['user_avatar'] as String?,
      isLiked: json['is_liked'] as bool? ?? false,
      replies: json['replies'] != null
          ? (json['replies'] as List).map((e) => Comment.fromJson(e)).toList()
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) '_id': id,
      'user_id': userId,
      'post_id': postId,
      if (parentId != null) 'parent_id': parentId,
      'content': content,
      'likes_count': likesCount,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
      if (updatedAt != null) 'updated_at': updatedAt!.toIso8601String(),
    };
  }

  Comment copyWith({
    String? id,
    String? userId,
    String? postId,
    String? parentId,
    String? content,
    int? likesCount,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? userName,
    String? username,
    String? userAvatar,
    bool? isLiked,
    List<Comment>? replies,
  }) {
    return Comment(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      postId: postId ?? this.postId,
      parentId: parentId ?? this.parentId,
      content: content ?? this.content,
      likesCount: likesCount ?? this.likesCount,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      userName: userName ?? this.userName,
      username: username ?? this.username,
      userAvatar: userAvatar ?? this.userAvatar,
      isLiked: isLiked ?? this.isLiked,
      replies: replies ?? this.replies,
    );
  }
}