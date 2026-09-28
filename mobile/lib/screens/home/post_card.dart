import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../models/post_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/post_provider.dart';
import '../../providers/group_provider.dart';
import '../../providers/chat_provider.dart';
import '../../models/conversation_model.dart';
import 'comments_screen.dart';
import 'edit_post_screen.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:flutter/services.dart';
import '../profile/public_profile_screen.dart';

class PostCard extends StatefulWidget {
  final Post post;

  const PostCard({super.key, required this.post});

  @override
  State<PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<PostCard> {
  int _currentImageIndex = 0;
  late bool _isLiked;
  late int _likesCount;

  @override
  void initState() {
    super.initState();
    _isLiked = widget.post.isLiked ?? false;
    _likesCount = widget.post.likesCount;
    timeago.setLocaleMessages('vi', timeago.ViMessages());
  }

  @override
  void didUpdateWidget(covariant PostCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.post.id != widget.post.id ||
        oldWidget.post.isLiked != widget.post.isLiked) {
      _isLiked = widget.post.isLiked ?? false;
      _likesCount = widget.post.likesCount;
    }
  }

  void _openUserProfile(String? userId) {
    if (userId == null || userId.isEmpty) return;
    final currentUserId = Provider.of<AuthProvider>(context, listen: false).user?.id;
    if (userId == currentUserId) return; // own profile handled by bottom nav
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => PublicProfileScreen(userId: userId)),
    );
  }

  void _showReportDialog() {
    final reasons = [
      'Spam hoặc gây hiểu lầm',
      'Nội dung không phù hợp',
      'Bạo lực hoặc nguy hiểm',
      'Quấy rối hoặc bắt nạt',
      'Vi phạm quyền riêng tư',
      'Khác',
    ];

    String? selectedReason;
    final descriptionController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Báo cáo bài viết'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Vui lòng chọn lý do báo cáo:'),
                const SizedBox(height: 8),
                ...reasons.map((reason) => RadioListTile<String>(
                  title: Text(reason, style: const TextStyle(fontSize: 14)),
                  value: reason,
                  groupValue: selectedReason,
                  contentPadding: EdgeInsets.zero,
                  onChanged: (value) {
                    setState(() {
                      selectedReason = value;
                    });
                  },
                )),
                const SizedBox(height: 12),
                const Text(
                  'Mô tả thêm (tùy chọn):',
                  style: TextStyle(fontSize: 14),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: descriptionController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    hintText: 'Nhập nội dung mô tả thêm...',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                  style: const TextStyle(fontSize: 14),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Hủy'),
            ),
            TextButton(
              onPressed: selectedReason == null
                  ? null
                  : () async {
                final authProvider = Provider.of<AuthProvider>(context, listen: false);
                final postProvider = Provider.of<PostProvider>(context, listen: false);

                final description = descriptionController.text.trim();

                final success = await postProvider.reportPost(
                  reporterId: authProvider.user!.id!,
                  reportedPostId: widget.post.id!,
                  reason: selectedReason!,
                  description: description.isEmpty ? null : description,
                  groupId: widget.post.groupId,
                );

                if (mounted) {
                  Navigator.pop(context);
                  Fluttertoast.showToast(
                    msg: success ? 'Đã gửi báo cáo' : 'Lỗi khi gửi báo cáo',
                    backgroundColor: success ? Colors.green : Colors.red,
                  );
                }
              },
              child: const Text('Gửi'),
            ),
          ],
        ),
      ),
    ).then((_) => descriptionController.dispose());
  }

  void _showPostOptions() {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final isOwner = authProvider.user?.id == widget.post.userId;

    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isOwner)
              ListTile(
                leading: const Icon(Icons.edit, color: Color(0xFF3b82f6)),
                title: const Text('Chỉnh sửa bài viết'),
                onTap: () async {
                  Navigator.pop(context);
                  final updated = await Navigator.push<Post>(
                    context,
                    MaterialPageRoute(
                      builder: (_) => EditPostScreen(post: widget.post),
                    ),
                  );
                  if (updated != null && mounted) {
                    // PostProvider already updated in-memory; just refresh UI
                    Provider.of<PostProvider>(context, listen: false)
                        .notifyIfNeeded();
                  }
                },
              ),
            if (isOwner)
              ListTile(
                leading: const Icon(Icons.delete, color: Colors.red),
                title: const Text('Xóa bài viết'),
                onTap: () async {
                  Navigator.pop(context); // Đóng bottom sheet

                  bool success = false;

                  // Always use PostProvider to delete; it handles global feed logic
                  final postProvider = Provider.of<PostProvider>(context, listen: false);
                  success = await postProvider.deletePost(widget.post.id!);
                  // also notify group provider about deletion so it can purge caches
                  final groupProvider = Provider.of<GroupProvider>(context, listen: false);
                  groupProvider.markPostDeleted(widget.post.id!);
                  // We still refresh group posts separately below if needed

                  if (success && mounted) {
                    Fluttertoast.showToast(msg: 'Đã xóa bài viết', backgroundColor: Colors.green);
                    
                    // Reload lại danh sách bài trong group (nếu đang ở group detail)
                    if (widget.post.groupId != null && widget.post.groupId!.isNotEmpty) {
                      final groupProvider = Provider.of<GroupProvider>(context, listen: false);
                      await groupProvider.fetchGroupPosts(widget.post.groupId!, refresh: true);
                    }
                  } else if (mounted) {
                    Fluttertoast.showToast(msg: 'Lỗi khi xóa bài viết', backgroundColor: Colors.red);
                  }
                },
              ),
            if (!isOwner)
              ListTile(
                leading: const Icon(Icons.flag, color: Colors.red),
                title: const Text('Báo cáo bài viết'),
                onTap: () {
                  Navigator.pop(context);
                  _showReportDialog();
                },
              ),
            ListTile(
              leading: const Icon(Icons.cancel),
              title: const Text('Hủy'),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final postProvider = Provider.of<PostProvider>(context);
    final userId = authProvider.user?.id ?? '';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Post header
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                GestureDetector(
                  onTap: () => _openUserProfile(widget.post.userId),
                  child: CircleAvatar(
                  radius: 20,
                  backgroundColor: const Color(0xFF3b82f6),
                  child: widget.post.userAvatar != null && widget.post.userAvatar!.isNotEmpty
                      ? ClipOval(
                    child: CachedNetworkImage(
                      imageUrl: widget.post.userAvatar!,
                      width: 40,
                      height: 40,
                      fit: BoxFit.cover,
                      errorWidget: (context, url, error) => Text(
                        // An toàn: lấy ký tự đầu nếu có
                        (widget.post.userName?.isNotEmpty == true
                            ? widget.post.userName![0].toUpperCase()
                            : (widget.post.username?.isNotEmpty == true
                            ? widget.post.username![0].toUpperCase()
                            : 'U')),
                        style: const TextStyle(color: Colors.white),
                      ),
                    ),
                  )
                      : Text(
                    (widget.post.userName?.isNotEmpty == true
                        ? widget.post.userName![0].toUpperCase()
                        : (widget.post.username?.isNotEmpty == true
                        ? widget.post.username![0].toUpperCase()
                        : 'U')),
                    style: const TextStyle(color: Colors.white),
                  ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      GestureDetector(
                        onTap: () => _openUserProfile(widget.post.userId),
                        child: Text(
                          // Ưu tiên: userName (fullName) → username → fallback
                          (widget.post.userName?.isNotEmpty == true
                              ? widget.post.userName!
                              : (widget.post.username?.isNotEmpty == true
                              ? '@${widget.post.username!}'
                              : 'Người dùng')),
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          ),
                        ),
                      ),
                      if (widget.post.userName != null &&
                          widget.post.userName!.isNotEmpty &&
                          widget.post.userName != widget.post.username)
                        Text(
                          widget.post.userName!,
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[700],
                          ),
                        ),
                      Row(
                        children: [
                          Text(
                            widget.post.createdAt != null
                                ? timeago.format(widget.post.createdAt!, locale: 'vi')
                                : 'Vừa xong',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Colors.grey,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            widget.post.visibility == 'friends'
                                ? Icons.people
                                : widget.post.visibility == 'private'
                                    ? Icons.lock
                                    : Icons.public,
                            size: 13,
                            color: Colors.grey,
                          ),
                          if (widget.post.isEdited) ...
                            [
                              const SizedBox(width: 4),
                              Text(
                                '• Đã chỉnh sửa',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey[500],
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ],
                        ],
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.more_horiz),
                  onPressed: _showPostOptions,
                ),
              ],
            ),
          ),

          // Tags
          if (widget.post.tags.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              child: Wrap(
                spacing: 6,
                runSpacing: 4,
                children: widget.post.tags.map((tag) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFF3b82f6).withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '#$tag',
                    style: const TextStyle(
                      fontSize: 11,
                      color: Color(0xFF3b82f6),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                )).toList(),
              ),
            ),

          // Post content
          if (widget.post.content != null && widget.post.content!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                widget.post.content!,
                style: const TextStyle(fontSize: 15),
              ),
            ),

          const SizedBox(height: 8),

          // Post media with carousel indicator
          if (widget.post.mediaUrls != null && widget.post.mediaUrls!.isNotEmpty)
            Stack(
              children: [
                SizedBox(
                  height: 300,
                  child: PageView.builder(
                    itemCount: widget.post.mediaUrls!.length,
                    onPageChanged: (index) {
                      setState(() {
                        _currentImageIndex = index;
                      });
                    },
                    itemBuilder: (context, index) {
                      return CachedNetworkImage(
                        imageUrl: widget.post.mediaUrls![index],
                        fit: BoxFit.cover,
                        placeholder: (context, url) => const Center(
                          child: CircularProgressIndicator(),
                        ),
                        errorWidget: (context, url, error) => const Center(
                          child: Icon(Icons.error),
                        ),
                      );
                    },
                  ),
                ),
                if (widget.post.mediaUrls!.length > 1)
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${_currentImageIndex + 1}/${widget.post.mediaUrls!.length}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                if (widget.post.mediaUrls!.length > 1)
                  Positioned(
                    bottom: 8,
                    left: 0,
                    right: 0,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(
                        widget.post.mediaUrls!.length,
                            (index) => Container(
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _currentImageIndex == index
                                ? Colors.white
                                : const Color.fromRGBO(255, 255, 255, 0.4),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),

          const SizedBox(height: 8),

          // Likes and comments count
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '$_likesCount lượt thích',
                  style: const TextStyle(color: Colors.grey),
                ),
                Row(
                  children: [
                    Text(
                      '${widget.post.commentsCount} bình luận',
                      style: const TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${widget.post.sharesCount} chia sẻ',
                      style: const TextStyle(color: Colors.grey),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          // Action buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              TextButton.icon(
                onPressed: () {
                  setState(() {
                    _isLiked = !_isLiked;
                    _likesCount += _isLiked ? 1 : -1;
                  });
                  if (widget.post.groupId != null) {
                    final gp = Provider.of<GroupProvider>(context, listen: false);
                    gp.toggleLikeOnGroupPost(widget.post.id!, userId);
                  } else {
                    postProvider.toggleLike(widget.post.id!, userId);
                  }
                },
                icon: Icon(
                  _isLiked ? Icons.favorite : Icons.favorite_border,
                  color: _isLiked ? Colors.red : Colors.grey,
                ),
                label: Text(
                  'Thích',
                  style: TextStyle(
                    color: _isLiked ? Colors.red : Colors.grey,
                  ),
                ),
              ),

              TextButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => CommentsScreen(post: widget.post),
                    ),
                  );
                },
                icon: const Icon(Icons.comment_outlined, color: Colors.grey),
                label: const Text('Bình luận', style: TextStyle(color: Colors.grey)),
              ),

              TextButton.icon(
                onPressed: () => _showShareToChatSheet(),
                icon: const Icon(Icons.share_outlined, color: Colors.grey),
                label: const Text('Chia sẻ', style: TextStyle(color: Colors.grey)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── Chia sẻ bài viết vào cuộc trò chuyện ─────────────────────────────
  void _showShareToChatSheet() {
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    // Đảm bảo đã load conversations
    if (chatProvider.conversations.isEmpty) {
      chatProvider.fetchConversations();
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.55,
          maxChildSize: 0.8,
          minChildSize: 0.35,
          builder: (_, scrollCtrl) {
            return Consumer<ChatProvider>(
              builder: (_, cp, __) {
                final conversations = cp.conversations;
                return Column(
                  children: [
                    // Header
                    Container(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          const Icon(Icons.send, color: Color(0xFF3b82f6)),
                          const SizedBox(width: 8),
                          const Text('Chia sẻ bài viết',
                            style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                          const Spacer(),
                          // Copy link fallback
                          IconButton(
                            icon: const Icon(Icons.link, color: Colors.grey),
                            tooltip: 'Sao chép liên kết',
                            onPressed: () {
                              final url = 'https://minisocial.app/posts/${widget.post.id}';
                              Clipboard.setData(ClipboardData(text: url));
                              Fluttertoast.showToast(
                                msg: 'Đã sao chép liên kết',
                                backgroundColor: Colors.green,
                              );
                              Navigator.pop(ctx);
                            },
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 1),
                    // Post preview
                    Container(
                      margin: const EdgeInsets.all(12),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Row(
                        children: [
                          if (widget.post.mediaUrls != null &&
                              widget.post.mediaUrls!.isNotEmpty)
                            ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: CachedNetworkImage(
                                imageUrl: widget.post.mediaUrls![0],
                                width: 48, height: 48, fit: BoxFit.cover,
                              ),
                            ),
                          if (widget.post.mediaUrls != null &&
                              widget.post.mediaUrls!.isNotEmpty)
                            const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              widget.post.content ?? '📷 Hình ảnh',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Conversation list
                    Expanded(
                      child: conversations.isEmpty
                          ? const Center(
                              child: Text('Chưa có cuộc trò chuyện nào',
                                style: TextStyle(color: Colors.grey)),
                            )
                          : ListView.builder(
                              controller: scrollCtrl,
                              itemCount: conversations.length,
                              itemBuilder: (_, i) {
                                final conv = conversations[i];
                                return _ShareConversationTile(
                                  conversation: conv,
                                  onTap: () => _doSharePost(conv, ctx),
                                );
                              },
                            ),
                    ),
                  ],
                );
              },
            );
          },
        );
      },
    );
  }

  Future<void> _doSharePost(ConversationModel conv, BuildContext sheetCtx) async {
    Navigator.pop(sheetCtx);
    final chatProvider = Provider.of<ChatProvider>(context, listen: false);
    final ok = await chatProvider.sharePost(
      convId: conv.id,
      postId: widget.post.id!,
      content: widget.post.content,
    );
    if (ok && mounted) {
      // Optimistic: increment share count in the relevant provider
      final postProvider = Provider.of<PostProvider>(context, listen: false);
      postProvider.incrementShareCount(widget.post.id!);
      if (widget.post.groupId != null && widget.post.groupId!.isNotEmpty) {
        Provider.of<GroupProvider>(context, listen: false)
            .incrementShareOnGroupPost(widget.post.id!);
      }
    }
    Fluttertoast.showToast(
      msg: ok ? 'Đã chia sẻ bài viết' : 'Không thể chia sẻ',
      backgroundColor: ok ? Colors.green : Colors.red,
    );
  }
}

// ── Tile cho conversation trong share sheet ─────────────────────────────
class _ShareConversationTile extends StatelessWidget {
  final ConversationModel conversation;
  final VoidCallback onTap;
  const _ShareConversationTile({required this.conversation, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: _buildAvatar(),
      title: Text(
        conversation.displayName,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
      ),
      subtitle: conversation.type == 'group'
          ? Text('${conversation.memberCount} thành viên',
              style: const TextStyle(fontSize: 12))
          : null,
      trailing: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0xFF3b82f6),
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Text('Gửi',
          style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
      ),
      onTap: onTap,
    );
  }

  Widget _buildAvatar() {
    final url = conversation.displayAvatar;
    if (url != null && url.isNotEmpty) {
      return CircleAvatar(
        radius: 22,
        backgroundImage: CachedNetworkImageProvider(url),
      );
    }
    return CircleAvatar(
      radius: 22,
      backgroundColor: const Color(0xFF3b82f6).withValues(alpha: 0.15),
      child: Icon(
        conversation.type == 'group' ? Icons.group : Icons.person,
        color: const Color(0xFF3b82f6),
        size: 22,
      ),
    );
  }
}