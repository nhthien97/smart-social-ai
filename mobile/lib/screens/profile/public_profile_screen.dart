// lib/screens/profile/public_profile_screen.dart
// Xem hồ sơ công khai của người dùng khác (UC1.7)

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../providers/auth_provider.dart';
import '../../services/user_service.dart';
import '../../services/friend_service.dart';
import '../../services/chat_service.dart';
import '../../services/post_service.dart';
import '../../services/api_service.dart';
import '../../models/post_model.dart';
import '../../models/conversation_model.dart';
import '../home/post_card.dart';
import '../chat/chat_detail_screen.dart';

class PublicProfileScreen extends StatefulWidget {
  final String userId;

  const PublicProfileScreen({super.key, required this.userId});

  @override
  State<PublicProfileScreen> createState() => _PublicProfileScreenState();
}

class _PublicProfileScreenState extends State<PublicProfileScreen> {
  final UserService _userService = UserService();
  final FriendService _friendService = FriendService();
  final ChatService _chatService = ChatService();

  bool _isLoading = true;
  String? _errorMsg;
  Map<String, dynamic>? _profile;

  // Friend status: 'none', 'friends', 'request_sent', 'request_received'
  String _friendStatus = 'none';
  String? _friendRequestId; // for accept/reject/cancel
  bool _friendActionLoading = false;

  // User posts
  List<Post> _userPosts = [];
  bool _isLoadingPosts = false;

  @override
  void initState() {
    super.initState();
    _loadProfile();
    _loadFriendStatus();
    _loadUserPosts();
  }

  Future<void> _loadProfile() async {
    setState(() {
      _isLoading = true;
      _errorMsg = null;
    });
    final result = await _userService.getPublicProfile(widget.userId);
    if (!mounted) return;
    if (result['success'] == true) {
      final data = result['data'];
      setState(() {
        _profile = (data is Map && data['data'] is Map)
            ? Map<String, dynamic>.from(data['data'])
            : Map<String, dynamic>.from(data as Map);
        _isLoading = false;
      });
    } else {
      setState(() {
        _errorMsg = result['message'] ?? 'Không thể tải hồ sơ';
        _isLoading = false;
      });
    }
  }

  Future<void> _loadFriendStatus() async {
    final result = await _friendService.checkFriendship(widget.userId);
    if (!mounted) return;
    if (result['success'] == true) {
      final data = result['data'];
      setState(() {
        _friendStatus = data['status'] ?? 'none';
        _friendRequestId = data['requestId']?.toString();
      });
    }
  }

  Future<void> _loadUserPosts() async {
    setState(() => _isLoadingPosts = true);
    try {
      final currentUserId = context.read<AuthProvider>().user?.id ?? '';
      final svc = PostService(ApiService().dio);
      final res = await svc.getUserPosts(
        widget.userId,
        currentUserId: currentUserId,
      );
      if (!mounted) return;
      final posts = res['posts'] as List<Post>? ?? [];
      setState(() {
        _userPosts = posts;
        _isLoadingPosts = false;
      });
    } catch (e) {
      if (mounted) setState(() => _isLoadingPosts = false);
    }
  }

  Future<void> _handleFriendAction() async {
    setState(() => _friendActionLoading = true);
    try {
      switch (_friendStatus) {
        case 'none':
          final res = await _friendService.sendRequest(widget.userId);
          if (res['success'] == true) {
            Fluttertoast.showToast(msg: 'Đã gửi lời mời kết bạn');
            await _loadFriendStatus();
          } else {
            Fluttertoast.showToast(msg: res['message'] ?? 'Lỗi');
          }
          break;
        case 'request_sent':
          if (_friendRequestId != null) {
            final res = await _friendService.cancelSentRequest(
              _friendRequestId!,
            );
            if (res['success'] == true) {
              Fluttertoast.showToast(msg: 'Đã hủy lời mời');
              await _loadFriendStatus();
            }
          }
          break;
        case 'request_received':
          if (_friendRequestId != null) {
            final res = await _friendService.acceptRequest(_friendRequestId!);
            if (res['success'] == true) {
              Fluttertoast.showToast(msg: 'Đã chấp nhận lời mời');
              await _loadFriendStatus();
            }
          }
          break;
        case 'friends':
          // Show unfriend confirmation
          final confirm = await showDialog<bool>(
            context: context,
            builder: (_) => AlertDialog(
              title: const Text('Hủy kết bạn'),
              content: const Text('Bạn có chắc muốn hủy kết bạn?'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('Hủy'),
                ),
                ElevatedButton(
                  onPressed: () => Navigator.pop(context, true),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                  child: const Text('Xác nhận'),
                ),
              ],
            ),
          );
          if (confirm == true) {
            final res = await _friendService.removeFriend(widget.userId);
            if (res['success'] == true) {
              Fluttertoast.showToast(msg: 'Đã hủy kết bạn');
              await _loadFriendStatus();
            }
          }
          break;
      }
    } finally {
      if (mounted) setState(() => _friendActionLoading = false);
    }
  }

  Future<void> _handleMessage() async {
    final result = await _chatService.createPrivateChat(widget.userId);
    if (!mounted) return;
    if (result['success'] == true) {
      final convData = result['data'];
      final conv = ConversationModel.fromJson(
        convData is Map<String, dynamic> ? convData : {},
      );
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => ChatDetailScreen(conversation: conv)),
      );
    } else {
      Fluttertoast.showToast(msg: result['message'] ?? 'Không thể mở chat');
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.read<AuthProvider>();
    final currentUserId = authProvider.user?.id ?? '';

    // Redirect self to own profile tab
    if (widget.userId == currentUserId) {
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => Navigator.pop(context),
      );
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _profile != null
              ? (_profile!['full_name'] ?? _profile!['username'] ?? 'Hồ sơ')
              : 'Hồ sơ',
        ),
        backgroundColor: const Color(0xFF1877F2),
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMsg != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text(
                    _errorMsg!,
                    style: const TextStyle(color: Colors.grey, fontSize: 15),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadProfile,
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: _loadProfile,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: _buildContent(),
              ),
            ),
    );
  }

  Widget _buildContent() {
    final p = _profile!;
    final fullName = p['full_name'] as String?;
    final username = p['username'] as String?;
    final avatarUrl = p['avatar_url'] as String?;
    final coverUrl = p['cover_url'] as String?;
    final bio = p['bio'] as String?;
    final job = p['job'] as String?;
    final location = p['location'] as String?;
    final gender = p['gender'] as String?;
    final birthdate = p['birthdate'] != null
        ? DateTime.tryParse(p['birthdate'].toString())
        : null;
    final createdAt = p['created_at'] != null
        ? DateTime.tryParse(p['created_at'].toString())
        : null;
    final displayName = fullName?.isNotEmpty == true
        ? fullName!
        : username ?? 'Người dùng';
    final initial = displayName[0].toUpperCase();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        // Ảnh bìa
        if (coverUrl != null && coverUrl.isNotEmpty)
          CachedNetworkImage(
            imageUrl: coverUrl,
            height: 180,
            width: double.infinity,
            fit: BoxFit.cover,
          )
        else
          Container(height: 180, color: const Color(0xFF1877F2)),

        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          child: Column(
            children: [
              // Avatar overlapping cover
              Transform.translate(
                offset: const Offset(0, -45),
                child: CircleAvatar(
                  radius: 55,
                  backgroundColor: Colors.white,
                  child: CircleAvatar(
                    radius: 52,
                    backgroundColor: Colors.blue.shade200,
                    child: avatarUrl != null && avatarUrl.isNotEmpty
                        ? ClipOval(
                            child: CachedNetworkImage(
                              imageUrl: avatarUrl,
                              width: 104,
                              height: 104,
                              fit: BoxFit.cover,
                              errorWidget: (_, __, ___) => Text(
                                initial,
                                style: const TextStyle(
                                  fontSize: 40,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          )
                        : Text(
                            initial,
                            style: const TextStyle(
                              fontSize: 40,
                              color: Colors.white,
                            ),
                          ),
                  ),
                ),
              ),

              // Reduce spacing from avatar
              const SizedBox(height: 0),

              // Name
              Text(
                displayName,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              if (username != null &&
                  username.isNotEmpty &&
                  username != fullName)
                Text(
                  '@$username',
                  style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                ),

              const SizedBox(height: 8),

              // Bio
              if (bio != null && bio.isNotEmpty)
                Text(
                  bio,
                  style: const TextStyle(fontSize: 14, color: Colors.black87),
                  textAlign: TextAlign.center,
                )
              else
                const Text(
                  'Chưa có tiểu sử',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey,
                    fontStyle: FontStyle.italic,
                  ),
                ),

              const SizedBox(height: 16),

              // ── Friend / Message buttons ──────────────────
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _friendActionLoading
                          ? null
                          : _handleFriendAction,
                      icon: _friendActionLoading
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Icon(_friendButtonIcon),
                      label: Text(_friendButtonLabel),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _friendButtonColor,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _handleMessage,
                      icon: const Icon(Icons.message),
                      label: const Text('Nhắn tin'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF1877F2),
                        side: const BorderSide(color: Color(0xFF1877F2)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 8),

              // Info rows
              if (job != null && job.isNotEmpty)
                _buildInfoRow(Icons.work_outline, job),
              if (location != null && location.isNotEmpty)
                _buildInfoRow(Icons.location_on_outlined, location),
              if (gender != null && gender.isNotEmpty)
                _buildInfoRow(
                  Icons.wc_outlined,
                  gender == 'male'
                      ? 'Nam'
                      : gender == 'female'
                      ? 'Nữ'
                      : 'Khác',
                ),
              if (birthdate != null)
                _buildInfoRow(
                  Icons.cake_outlined,
                  '${birthdate.day.toString().padLeft(2, '0')}/${birthdate.month.toString().padLeft(2, '0')}/${birthdate.year}',
                ),
              if (createdAt != null)
                _buildInfoRow(
                  Icons.calendar_today_outlined,
                  'Tham gia ${createdAt.month}/${createdAt.year}',
                ),
            ],
          ),
        ),

        // ── User posts section ────────────────────────────
        const Padding(
          padding: EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Bài viết',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),
        ),
        if (_isLoadingPosts)
          const Padding(
            padding: EdgeInsets.all(24),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (_userPosts.isEmpty)
          Padding(
            padding: const EdgeInsets.all(24),
            child: Center(
              child: Text(
                'Chưa có bài viết nào',
                style: TextStyle(color: Colors.grey[500]),
              ),
            ),
          )
        else
          ..._userPosts.map((post) => PostCard(post: post)),
      ],
    );
  }

  String get _friendButtonLabel {
    switch (_friendStatus) {
      case 'friends':
        return 'Bạn bè';
      case 'request_sent':
        return 'Hủy yêu cầu KB';
      case 'request_received':
        return 'Chấp nhận';
      default:
        return 'Kết bạn';
    }
  }

  IconData get _friendButtonIcon {
    switch (_friendStatus) {
      case 'friends':
        return Icons.people;
      case 'request_sent':
        return Icons.hourglass_top;
      case 'request_received':
        return Icons.person_add;
      default:
        return Icons.person_add_alt_1;
    }
  }

  Color get _friendButtonColor {
    switch (_friendStatus) {
      case 'friends':
        return Colors.green;
      case 'request_sent':
        return Colors.orange;
      case 'request_received':
        return const Color(0xFF1877F2);
      default:
        return const Color(0xFF1877F2);
    }
  }

  Widget _buildInfoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, color: Colors.blueGrey, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 15, color: Colors.black87),
            ),
          ),
        ],
      ),
    );
  }
}
