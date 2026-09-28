// lib/screens/chat/create_group_screen.dart
// Tạo nhóm chat: chọn tên + ảnh + thành viên từ danh sách bạn bè

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:image_picker/image_picker.dart';
import '../../providers/chat_provider.dart';
import '../../services/chat_service.dart';
import '../../services/cloudinary_service.dart';
import 'chat_detail_screen.dart';

class CreateGroupScreen extends StatefulWidget {
  const CreateGroupScreen({super.key});

  @override
  State<CreateGroupScreen> createState() => _CreateGroupScreenState();
}

class _CreateGroupScreenState extends State<CreateGroupScreen> {
  final ChatService _chatService = ChatService();
  final CloudinaryService _cloudinary = CloudinaryService();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _searchController = TextEditingController();

  List<dynamic> _friends = [];
  List<dynamic> _filtered = [];
  final Set<String> _selectedIds = {};
  bool _isLoading = true;
  bool _isCreating = false;
  String? _avatarUrl;

  @override
  void initState() {
    super.initState();
    _loadFriends();
  }

  Future<void> _loadFriends() async {
    final result = await _chatService.getFriends();
    if (result['success'] == true) {
      final data = result['data'];
      List<dynamic> friends = [];
      if (data is Map && data['friends'] != null) {
        friends = data['friends'] as List;
      } else if (data is List) {
        friends = data;
      }
      setState(() {
        _friends = friends;
        _filtered = friends;
        _isLoading = false;
      });
    } else {
      setState(() => _isLoading = false);
    }
  }

  void _filterFriends(String query) {
    if (query.isEmpty) {
      setState(() => _filtered = _friends);
      return;
    }
    final q = query.toLowerCase();
    setState(() {
      _filtered = _friends.where((f) {
        final name = (f['fullName'] ?? f['full_name'] ?? f['username'] ?? '').toString().toLowerCase();
        return name.contains(q);
      }).toList();
    });
  }

  void _toggleSelect(String id) {
    setState(() {
      if (_selectedIds.contains(id)) {
        _selectedIds.remove(id);
      } else {
        _selectedIds.add(id);
      }
    });
  }

  Future<void> _pickAvatar() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (file == null) return;

    try {
      final url = await _cloudinary.uploadXFile(file);
      if (url != null) {
        setState(() => _avatarUrl = url);
      }
    } catch (e) {
      Fluttertoast.showToast(msg: 'Lỗi upload ảnh: $e');
    }
  }

  Future<void> _createGroup() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      Fluttertoast.showToast(msg: 'Vui lòng nhập tên nhóm');
      return;
    }
    if (_selectedIds.isEmpty || _selectedIds.length < 2) {
      Fluttertoast.showToast(msg: 'Chọn ít nhất 2 thành viên (cần tối thiểu 3 người trong nhóm)');
      return;
    }

    setState(() => _isCreating = true);

    final chatProvider = context.read<ChatProvider>();
    final conv = await chatProvider.createGroupChat(
      name: name,
      participantIds: _selectedIds.toList(),
      avatarUrl: _avatarUrl,
    );

    setState(() => _isCreating = false);

    if (conv != null && mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => ChatDetailScreen(conversation: conv)),
      );
    } else {
      Fluttertoast.showToast(msg: chatProvider.error ?? 'Không thể tạo nhóm');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tạo nhóm chat'),
        backgroundColor: const Color(0xFF3b82f6),
        foregroundColor: Colors.white,
        actions: [
          _isCreating
              ? const Padding(
                  padding: EdgeInsets.all(16),
                  child: SizedBox(width: 20, height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
                )
              : TextButton(
                  onPressed: _createGroup,
                  child: const Text('Tạo', style: TextStyle(
                    color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                ),
        ],
      ),
      body: Column(
        children: [
          // ── Group info ─────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Row(
              children: [
                GestureDetector(
                  onTap: _pickAvatar,
                  child: CircleAvatar(
                    radius: 28,
                    backgroundColor: Colors.grey.shade200,
                    backgroundImage: _avatarUrl != null
                        ? CachedNetworkImageProvider(_avatarUrl!)
                        : null,
                    child: _avatarUrl == null
                        ? const Icon(Icons.camera_alt, color: Colors.grey)
                        : null,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _nameController,
                    decoration: const InputDecoration(
                      hintText: 'Tên nhóm',
                      border: InputBorder.none,
                    ),
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
          ),

          // ── Selected count ─────────────────────────────────
          if (_selectedIds.isNotEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              color: const Color.fromRGBO(59, 130, 246, 0.08),
              child: Text(
                'Đã chọn ${_selectedIds.length} thành viên',
                style: const TextStyle(color: Color(0xFF3b82f6), fontWeight: FontWeight.w600),
              ),
            ),

          // ── Search bar ─────────────────────────────────────
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _searchController,
              onChanged: _filterFriends,
              decoration: InputDecoration(
                hintText: 'Tìm bạn bè...',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: Colors.grey.shade100,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),

          // ── Friends list ───────────────────────────────────
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    itemCount: _filtered.length,
                    itemBuilder: (context, index) {
                      final friend = _filtered[index];
                      final id = (friend['_id'] ?? friend['id']).toString();
                      final name = friend['fullName'] ?? friend['full_name'] ?? friend['username'] ?? 'Người dùng';
                      final avatar = friend['avatar'] ?? friend['avatar_url'];
                      final isSelected = _selectedIds.contains(id);

                      return CheckboxListTile(
                        value: isSelected,
                        activeColor: const Color(0xFF3b82f6),
                        onChanged: (_) => _toggleSelect(id),
                        secondary: avatar != null && avatar.toString().isNotEmpty
                            ? CircleAvatar(
                                backgroundImage: CachedNetworkImageProvider(avatar.toString()),
                              )
                            : const CircleAvatar(child: Icon(Icons.person)),
                        title: Text(name, style: const TextStyle(fontWeight: FontWeight.w500)),
                        subtitle: Text(friend['username'] ?? '', style: const TextStyle(fontSize: 13)),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
