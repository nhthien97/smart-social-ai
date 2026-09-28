// lib/screens/chat/new_chat_screen.dart
// Chọn bạn bè để tạo chat riêng 1-1

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../providers/chat_provider.dart';
import '../../services/chat_service.dart';
import 'chat_detail_screen.dart';

class NewChatScreen extends StatefulWidget {
  const NewChatScreen({super.key});

  @override
  State<NewChatScreen> createState() => _NewChatScreenState();
}

class _NewChatScreenState extends State<NewChatScreen> {
  final ChatService _chatService = ChatService();
  List<dynamic> _friends = [];
  List<dynamic> _filtered = [];
  bool _isLoading = true;
  final TextEditingController _searchController = TextEditingController();

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
      Fluttertoast.showToast(msg: result['message'] ?? 'Lỗi tải bạn bè');
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

  Future<void> _startChat(dynamic friend) async {
    final friendId = friend['_id']?.toString() ?? friend['id']?.toString() ?? '';
    if (friendId.isEmpty) return;

    final chatProvider = context.read<ChatProvider>();
    final conv = await chatProvider.createPrivateChat(friendId);
    if (conv != null && mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => ChatDetailScreen(conversation: conv)),
      );
    } else {
      Fluttertoast.showToast(msg: chatProvider.error ?? 'Không thể tạo cuộc trò chuyện');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chat mới'),
        backgroundColor: const Color(0xFF3b82f6),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Search bar
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

          // Friends list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filtered.isEmpty
                    ? const Center(child: Text('Không tìm thấy bạn bè',
                        style: TextStyle(color: Colors.grey)))
                    : ListView.builder(
                        itemCount: _filtered.length,
                        itemBuilder: (context, index) {
                          final friend = _filtered[index];
                          final name = friend['fullName'] ?? friend['full_name'] ?? friend['username'] ?? 'Người dùng';
                          final avatar = friend['avatar'] ?? friend['avatar_url'];

                          return ListTile(
                            leading: avatar != null && avatar.toString().isNotEmpty
                                ? CircleAvatar(
                                    backgroundImage: CachedNetworkImageProvider(avatar.toString()),
                                  )
                                : const CircleAvatar(child: Icon(Icons.person)),
                            title: Text(name, style: const TextStyle(fontWeight: FontWeight.w500)),
                            subtitle: Text(friend['username'] ?? '', style: const TextStyle(fontSize: 13)),
                            trailing: const Icon(Icons.chat_bubble_outline, color: Color(0xFF3b82f6)),
                            onTap: () => _startChat(friend),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
