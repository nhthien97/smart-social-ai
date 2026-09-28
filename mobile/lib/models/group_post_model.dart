enum PostStatus { pending, approved }

class GroupPostModel {
  final String id;
  final String groupId;
  final String authorId;
  final String content;
  final DateTime createdAt;
  final PostStatus status;

  GroupPostModel({
    required this.id,
    required this.groupId,
    required this.authorId,
    required this.content,
    required this.createdAt,
    required this.status,
  });

  factory GroupPostModel.fromJson(Map<String, dynamic> json) {
    return GroupPostModel(
      id: json['_id'],
      groupId: json['groupId'],
      authorId: json['authorId'],
      content: json['content'],
      createdAt: DateTime.parse(json['createdAt']),
      status: json['status'] == 'approved'
          ? PostStatus.approved
          : PostStatus.pending,
    );
  }
}