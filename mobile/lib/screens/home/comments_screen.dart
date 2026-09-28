import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../models/post_model.dart';
import '../../models/comment_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/post_provider.dart';
import '../../providers/group_provider.dart';
import '../../services/post_service.dart';
import '../../services/api_service.dart';
import '../../components/emoji_picker_sheet.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../profile/public_profile_screen.dart';

class CommentsScreen extends StatefulWidget {
  final Post post;

  const CommentsScreen({super.key, required this.post});

  @override
  State<CommentsScreen> createState() => _CommentsScreenState();
}

class _CommentsScreenState extends State<CommentsScreen> {
  final TextEditingController _commentController = TextEditingController();
  final PostService _postService = PostService(ApiService().dio);
  List<Comment> _comments = [];
  bool _isLoading = false;
  bool _isSendingComment = false;
  DateTime? _lastCommentTime;
  String? _replyToCommentId;
  String? _replyToUserName;

  @override
  void initState() {
    super.initState();
    timeago.setLocaleMessages('vi', timeago.ViMessages());
    _loadComments();
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  void _openUserProfile(String? userId) {
    if (userId == null || userId.isEmpty) return;
    final currentUserId = Provider.of<AuthProvider>(context, listen: false).user?.id;
    if (userId == currentUserId) return;
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => PublicProfileScreen(userId: userId)),
    );
  }

  Future<void> _loadComments() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final postProvider = Provider.of<PostProvider>(context, listen: false);
      final userId = authProvider.user?.id;
      
      final comments = await postProvider.getComments(widget.post.id!, userId: userId);
      
      // Load replies for each comment
      for (var i = 0; i < comments.length; i++) {
        if (comments[i].id != null) {
          final replies = await _postService.getReplies(comments[i].id!, userId: userId);
          comments[i] = comments[i].copyWith(replies: replies);
        }
      }
      
      setState(() {
        _comments = comments;
      });
    } catch (e) {
      Fluttertoast.showToast(
        msg: 'Lỗi khi tải bình luận',
        backgroundColor: Colors.red,
      );
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _addComment() async {
    final content = _commentController.text.trim();
    if (content.isEmpty) return;
    if (_isSendingComment) return;
    // Cooldown: prevent rapid comment submissions (2 seconds)
    if (_lastCommentTime != null &&
        DateTime.now().difference(_lastCommentTime!).inSeconds < 2) {
      Fluttertoast.showToast(
        msg: 'Vui lòng chờ vài giây trước khi gửi tiếp',
        backgroundColor: Colors.orange,
      );
      return;
    }

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final postProvider = Provider.of<PostProvider>(context, listen: false);
    final userId = authProvider.user?.id;

    if (userId == null) {
      Fluttertoast.showToast(
        msg: 'Vui lòng đăng nhập',
        backgroundColor: Colors.red,
      );
      return;
    }

    setState(() => _isSendingComment = true);
    _commentController.clear();

    try {
      final comment = await postProvider.createComment(
        userId: userId,
        postId: widget.post.id!,
        parentId: _replyToCommentId,
        content: content,
      );

      if (comment != null) {
        _lastCommentTime = DateTime.now();
        setState(() {
          _replyToCommentId = null;
          _replyToUserName = null;
        });
        _loadComments();

        // If this is a group post, also update group provider local count
        final groupProvider = Provider.of<GroupProvider>(context, listen: false);
        if (widget.post.groupId != null) {
          groupProvider.incrementCommentsOnGroupPost(widget.post.id!, 1);
        }
        
        Fluttertoast.showToast(
          msg: 'Đã thêm bình luận',
          backgroundColor: Colors.green,
        );
      }
    } catch (e) {
      Fluttertoast.showToast(
        msg: 'Lỗi khi thêm bình luận',
        backgroundColor: Colors.red,
      );
    } finally {
      if (mounted) setState(() => _isSendingComment = false);
    }
  }

  Future<void> _toggleCommentLike(String commentId) async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final postProvider = Provider.of<PostProvider>(context, listen: false);
    final userId = authProvider.user?.id;

    if (userId == null) return;

    await postProvider.toggleCommentLike(commentId, userId);
    _loadComments();
  }

  void _setReplyTo(String commentId, String userName) {
    setState(() {
      _replyToCommentId = commentId;
      _replyToUserName = userName;
    });
    FocusScope.of(context).requestFocus(FocusNode());
  }

  void _cancelReply() {
    setState(() {
      _replyToCommentId = null;
      _replyToUserName = null;
    });
  }

  void _showEmojiPicker() {
    showEmojiPickerSheet(context, onEmojiSelected: (emoji) {
      final pos = _commentController.selection.baseOffset;
      final text = _commentController.text;
      final newText = pos < 0
          ? text + emoji
          : text.substring(0, pos) + emoji + text.substring(pos);
      _commentController.value = _commentController.value.copyWith(
        text: newText,
        selection: TextSelection.collapsed(
            offset: (pos < 0 ? text.length : pos) + emoji.length),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bình luận'),
      ),
      body: Column(
        children: [
          // Comments list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _comments.isEmpty
                    ? const Center(
                        child: Text('Chưa có bình luận nào'),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: _comments.length,
                        itemBuilder: (context, index) {
                          final comment = _comments[index];
                          return _buildCommentItem(comment);
                        },
                      ),
          ),

          // Reply to indicator
          if (_replyToUserName != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: Colors.grey.shade200,
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Đang trả lời $_replyToUserName',
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: _cancelReply,
                  ),
                ],
              ),
            ),

          // Comment input
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.shade300,
                  blurRadius: 4,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.emoji_emotions_outlined,
                      color: Color(0xFFf59e0b)),
                  onPressed: _showEmojiPicker,
                  tooltip: 'Emoji',
                ),
                Expanded(
                  child: TextField(
                    controller: _commentController,
                    decoration: InputDecoration(
                      hintText: _replyToUserName != null
                          ? 'Trả lời $_replyToUserName...'
                          : 'Viết bình luận...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: BorderSide.none,
                      ),
                      filled: true,
                      fillColor: Colors.grey.shade200,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: Icon(Icons.send, color: _isSendingComment ? Colors.grey : const Color(0xFF3b82f6)),
                  onPressed: _isSendingComment ? null : _addComment,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCommentItem(Comment comment, {bool isReply = false}) {
    return Padding(
      padding: EdgeInsets.only(
        left: isReply ? 48.0 : 0,
        bottom: 12,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GestureDetector(
                onTap: () => _openUserProfile(comment.userId),
                child: CircleAvatar(
                radius: isReply ? 16 : 20,
                backgroundColor: const Color(0xFF3b82f6),
                child: comment.userAvatar != null
                    ? ClipOval(
                        child: CachedNetworkImage(
                          imageUrl: comment.userAvatar!,
                          width: isReply ? 32 : 40,
                          height: isReply ? 32 : 40,
                          fit: BoxFit.cover,
                          errorWidget: (context, url, error) => Text(
                            comment.userName?.substring(0, 1).toUpperCase() ?? 'U',
                            style: const TextStyle(color: Colors.white),
                          ),
                        ),
                      )
                    : Text(
                        comment.userName?.substring(0, 1).toUpperCase() ?? 'U',
                        style: const TextStyle(color: Colors.white),
                      ),
                  ),
                ),
                const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          GestureDetector(
                            onTap: () => _openUserProfile(comment.userId),
                            child: Text(
                              comment.username ?? comment.userName ?? 'Người dùng',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            comment.content,
                            style: const TextStyle(fontSize: 14),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        if (comment.createdAt != null)
                          Text(
                            timeago.format(comment.createdAt!, locale: 'vi'),
                            style: const TextStyle(
                              fontSize: 12,
                              color: Colors.grey,
                            ),
                          ),
                        const SizedBox(width: 16),
                        GestureDetector(
                          onTap: () {
                            if (comment.id != null) {
                              _toggleCommentLike(comment.id!);
                            }
                          },
                          child: Text(
                            'Thích (${comment.likesCount})',
                            style: TextStyle(
                              fontSize: 12,
                              color: comment.isLiked == true
                                  ? const Color(0xFF3b82f6)
                                  : Colors.grey,
                              fontWeight: comment.isLiked == true
                                  ? FontWeight.bold
                                  : FontWeight.normal,
                            ),
                          ),
                        ),
                        if (!isReply) ...[
                          const SizedBox(width: 16),
                          GestureDetector(
                            onTap: () {
                              _setReplyTo(
                                comment.id!,
                                comment.userName ?? 'Người dùng',
                              );
                            },
                            child: const Text(
                              'Trả lời',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          
          // Replies
          if (!isReply && comment.replies != null && comment.replies!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Column(
                children: comment.replies!
                    .map((reply) => _buildCommentItem(reply, isReply: true))
                    .toList(),
              ),
            ),
        ],
      ),
    );
  }
}
