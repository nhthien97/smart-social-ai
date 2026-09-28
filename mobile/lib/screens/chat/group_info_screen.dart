// lib/screens/chat/group_info_screen.dart
// Thông tin nhóm: danh sách thành viên, quản lý vai trò, thêm/xóa, rời nhóm

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:image_picker/image_picker.dart';
import '../../providers/chat_provider.dart';
import '../../providers/auth_provider.dart';
import '../../models/conversation_model.dart';
import '../../models/message_model.dart';
import '../../services/chat_service.dart';
import '../../services/cloudinary_service.dart';

class GroupInfoScreen extends StatefulWidget {
  final ConversationModel conversation;
  const GroupInfoScreen({super.key, required this.conversation});

  @override
  State<GroupInfoScreen> createState() => _GroupInfoScreenState();
}

class _GroupInfoScreenState extends State<GroupInfoScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ChatProvider>().fetchMembers(widget.conversation.id);
    });
  }

  String? get _currentUserId => context.read<AuthProvider>().user?.id;

  ParticipantModel? _findMyRole(List<ParticipantModel> members) {
    try {
      return members.firstWhere((m) => m.userId == _currentUserId);
    } catch (_) {
      return null;
    }
  }

  bool _canManage(ParticipantModel? myRole) {
    return myRole?.isLeader == true || myRole?.isAdmin == true;
  }

  Future<void> _editGroupName() async {
    final controller = TextEditingController(text: widget.conversation.name);
    final newName = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Đổi tên nhóm'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(border: OutlineInputBorder()),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Hủy')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Lưu'),
          ),
        ],
      ),
    );
    if (newName != null && newName.isNotEmpty && newName != widget.conversation.name) {
      final ok = await context.read<ChatProvider>().updateGroup(widget.conversation.id, name: newName);
      if (ok) Fluttertoast.showToast(msg: 'Đã đổi tên nhóm');
    }
  }

  Future<void> _changeAvatar() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (file == null) return;
    try {
      final url = await CloudinaryService().uploadXFile(file);
      if (url != null && mounted) {
        final ok = await context.read<ChatProvider>().updateGroup(widget.conversation.id, avatarUrl: url);
        if (ok) Fluttertoast.showToast(msg: 'Đã đổi ảnh nhóm');
      }
    } catch (e) {
      Fluttertoast.showToast(msg: 'Lỗi upload ảnh: $e');
    }
  }

  Future<void> _addMemberDialog() async {
    final chatService = ChatService();
    final result = await chatService.getFriends();
    if (result['success'] != true) {
      Fluttertoast.showToast(msg: 'Lỗi tải bạn bè');
      return;
    }

    final data = result['data'];
    List<dynamic> friends = [];
    if (data is Map && data['friends'] != null) {
      friends = data['friends'] as List;
    } else if (data is List) {
      friends = data;
    }

    // Lọc bỏ những ai đã trong nhóm
    final chatProvider = context.read<ChatProvider>();
    final existingIds = chatProvider.getMembers(widget.conversation.id).map((m) => m.userId).toSet();
    friends = friends.where((f) {
      final id = (f['_id'] ?? f['id']).toString();
      return !existingIds.contains(id);
    }).toList();

    if (friends.isEmpty) {
      Fluttertoast.showToast(msg: 'Tất cả bạn bè đã trong nhóm');
      return;
    }

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        builder: (_, scrollController) => Column(
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Thêm thành viên',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            Expanded(
              child: ListView.builder(
                controller: scrollController,
                itemCount: friends.length,
                itemBuilder: (context, index) {
                  final friend = friends[index];
                  final id = (friend['_id'] ?? friend['id']).toString();
                  final name = friend['fullName'] ?? friend['full_name'] ?? friend['username'] ?? 'Người dùng';
                  final avatar = friend['avatar'] ?? friend['avatar_url'];

                  return ListTile(
                    leading: avatar != null && avatar.toString().isNotEmpty
                        ? CircleAvatar(backgroundImage: CachedNetworkImageProvider(avatar.toString()))
                        : const CircleAvatar(child: Icon(Icons.person)),
                    title: Text(name),
                    trailing: IconButton(
                      icon: const Icon(Icons.person_add, color: Color(0xFF3b82f6)),
                      onPressed: () async {
                        final ok = await chatProvider.addMember(widget.conversation.id, id);
                        if (ok) {
                          Fluttertoast.showToast(msg: 'Đã thêm $name');
                          if (context.mounted) Navigator.pop(context);
                        } else {
                          Fluttertoast.showToast(msg: 'Không thể thêm');
                        }
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showMemberActions(ParticipantModel member, ParticipantModel? myRole) {
    final isMe = member.userId == _currentUserId;
    if (isMe) return; // Không thể tự thao tác
    if (!_canManage(myRole)) return;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(width: 40, height: 4, decoration: BoxDecoration(
              color: Colors.grey[300], borderRadius: BorderRadius.circular(2),
            )),
            ListTile(
              title: Text(member.displayName, style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text(_roleLabel(member.role)),
            ),
            const Divider(height: 1),
            // Đổi vai trò (chỉ leader)
            if (myRole?.isLeader == true) ...[
              if (member.role == 'member')
                ListTile(
                  leading: const Icon(Icons.admin_panel_settings, color: Colors.orange),
                  title: const Text('Chỉ định làm quản trị viên'),
                  onTap: () async {
                    Navigator.pop(context);
                    await context.read<ChatProvider>()
                        .updateRole(widget.conversation.id, member.userId, 'admin');
                    Fluttertoast.showToast(msg: 'Đã chỉ định QTV');
                  },
                ),
              if (member.role == 'admin')
                ListTile(
                  leading: const Icon(Icons.person, color: Colors.grey),
                  title: const Text('Gỡ quyền quản trị viên'),
                  onTap: () async {
                    Navigator.pop(context);
                    await context.read<ChatProvider>()
                        .updateRole(widget.conversation.id, member.userId, 'member');
                    Fluttertoast.showToast(msg: 'Đã gỡ quyền QTV');
                  },
                ),
              ListTile(
                leading: const Icon(Icons.swap_horiz, color: Color(0xFF3b82f6)),
                title: const Text('Chuyển quyền nhóm trưởng'),
                onTap: () async {
                  Navigator.pop(context);
                  final confirm = await showDialog<bool>(
                    context: context,
                    builder: (_) => AlertDialog(
                      title: const Text('Xác nhận'),
                      content: Text('Chuyển quyền nhóm trưởng cho ${member.displayName}?'),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Hủy')),
                        ElevatedButton(
                          onPressed: () => Navigator.pop(context, true),
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF3b82f6)),
                          child: const Text('Xác nhận'),
                        ),
                      ],
                    ),
                  );
                  if (confirm == true) {
                    await context.read<ChatProvider>()
                        .transferLeadership(widget.conversation.id, member.userId);
                    Fluttertoast.showToast(msg: 'Đã chuyển quyền');
                  }
                },
              ),
            ],
            // Xóa thành viên
            ListTile(
              leading: const Icon(Icons.remove_circle, color: Colors.red),
              title: const Text('Xóa khỏi nhóm', style: TextStyle(color: Colors.red)),
              onTap: () async {
                Navigator.pop(context);
                final ok = await context.read<ChatProvider>()
                    .removeMember(widget.conversation.id, member.userId);
                if (ok) Fluttertoast.showToast(msg: 'Đã xóa ${member.displayName}');
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Future<void> _leaveGroup() async {
    final chatProvider = context.read<ChatProvider>();
    final members = chatProvider.getMembers(widget.conversation.id);
    final myRole = _findMyRole(members);

    // Leader must transfer or dissolve first
    if (myRole?.isLeader == true) {
      final otherMembers = members.where((m) => m.userId != _currentUserId).toList();
      if (otherMembers.isEmpty) {
        // Solo leader - confirm dissolve group
        final confirm = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Giải tán nhóm'),
            content: const Text('Bạn là nhóm trưởng duy nhất. Rời nhóm sẽ giải tán nhóm này. Xác nhận?'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Hủy')),
              ElevatedButton(
                onPressed: () => Navigator.pop(context, true),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                child: const Text('Giải tán', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        );
        if (confirm != true) return;
      } else {
        // Has other members - must transfer leadership
        await showDialog(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Không thể rời nhóm'),
            content: const Text('Bạn là nhóm trưởng. Vui lòng chuyển quyền nhóm trưởng cho thành viên khác trước khi rời nhóm.'),
            actions: [
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF3b82f6)),
                child: const Text('Đã hiểu'),
              ),
            ],
          ),
        );
        return;
      }
    } else {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Rời nhóm'),
          content: const Text('Bạn có chắc muốn rời khỏi nhóm này?'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Hủy')),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              child: const Text('Rời nhóm', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      );
      if (confirm != true) return;
    }

    final ok = await chatProvider.leaveGroup(widget.conversation.id);
    if (ok && mounted) {
      Fluttertoast.showToast(msg: 'Đã rời nhóm');
      Navigator.of(context).popUntil((route) => route.isFirst);
    } else {
      Fluttertoast.showToast(msg: 'Không thể rời nhóm, vui lòng thử lại');
    }
  }

  String _roleLabel(String role) {
    switch (role) {
      case 'leader': return 'Nhóm trưởng';
      case 'admin': return 'Quản trị viên';
      default: return 'Thành viên';
    }
  }

  Color _roleBadgeColor(String role) {
    switch (role) {
      case 'leader': return Colors.amber;
      case 'admin': return Colors.orange;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Thông tin nhóm'),
        backgroundColor: const Color(0xFF3b82f6),
        foregroundColor: Colors.white,
      ),
      body: Consumer<ChatProvider>(
        builder: (context, chatProvider, _) {
          final members = chatProvider.getMembers(widget.conversation.id);
          final myRole = _findMyRole(members);

          return ListView(
            children: [
              // ── Group header ────────────────────────────────
              Container(
                padding: const EdgeInsets.all(24),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF3b82f6), Color(0xFF8b5cf6)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 40,
                      backgroundColor: Colors.white24,
                      backgroundImage: widget.conversation.avatarUrl != null
                          ? CachedNetworkImageProvider(widget.conversation.avatarUrl!)
                          : null,
                      child: widget.conversation.avatarUrl == null
                          ? const Icon(Icons.group, size: 40, color: Colors.white)
                          : null,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      widget.conversation.displayName,
                      style: const TextStyle(
                        fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${members.length} thành viên',
                      style: const TextStyle(color: Colors.white70),
                    ),
                  ],
                ),
              ),

              // ── Actions ──────────────────────────────────────
              if (_canManage(myRole)) ...[
                const SizedBox(height: 8),
                ListTile(
                  leading: const Icon(Icons.edit, color: Color(0xFF3b82f6)),
                  title: const Text('Đổi tên nhóm'),
                  onTap: _editGroupName,
                ),
                ListTile(
                  leading: const Icon(Icons.camera_alt, color: Color(0xFF3b82f6)),
                  title: const Text('Đổi ảnh nhóm'),
                  onTap: _changeAvatar,
                ),
                ListTile(
                  leading: const Icon(Icons.person_add, color: Color(0xFF3b82f6)),
                  title: const Text('Thêm thành viên'),
                  onTap: _addMemberDialog,
                ),
                const Divider(),
              ],

              // ── Members list ─────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                child: Text('Thành viên (${members.length})',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
              ...members.map((m) => ListTile(
                leading: m.avatarUrl != null && m.avatarUrl!.isNotEmpty
                    ? CircleAvatar(backgroundImage: CachedNetworkImageProvider(m.avatarUrl!))
                    : const CircleAvatar(child: Icon(Icons.person)),
                title: Row(
                  children: [
                    Flexible(child: Text(m.displayName,
                      style: const TextStyle(fontWeight: FontWeight.w500),
                      overflow: TextOverflow.ellipsis)),
                    if (m.userId == _currentUserId)
                      const Text(' (bạn)', style: TextStyle(color: Colors.grey, fontSize: 12)),
                  ],
                ),
                subtitle: Text(
                  _roleLabel(m.role),
                  style: TextStyle(fontSize: 12, color: _roleBadgeColor(m.role)),
                ),
                trailing: m.role != 'member'
                    ? Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: _roleBadgeColor(m.role).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          m.isLeader ? '👑' : '⭐',
                          style: const TextStyle(fontSize: 14),
                        ),
                      )
                    : null,
                onLongPress: () => _showMemberActions(m, myRole),
              )),

              // ── Leave group ──────────────────────────────────
              const SizedBox(height: 16),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.exit_to_app, color: Colors.red),
                title: const Text('Rời nhóm', style: TextStyle(color: Colors.red)),
                onTap: _leaveGroup,
              ),
              const SizedBox(height: 32),
            ],
          );
        },
      ),
    );
  }
}
