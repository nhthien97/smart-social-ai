// lib/screens/friends/friends_screen.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../services/friend_service.dart';
import '../../providers/chat_provider.dart';
import '../../providers/friend_provider.dart';
import '../chat/chat_detail_screen.dart';

class FriendsScreen extends StatefulWidget {
  const FriendsScreen({super.key});

  @override
  State<FriendsScreen> createState() => _FriendsScreenState();
}

class _FriendsScreenState extends State<FriendsScreen> with TickerProviderStateMixin {
  late TabController _tabController;
  final FriendService _friendService = FriendService();

  final TextEditingController _searchController = TextEditingController();
  List<dynamic> _friends = [];
  List<dynamic> _requests = [];
  List<dynamic> _suggestions = [];
  List<dynamic> _sentRequests = [];
  bool _loading = false;
  String _searchQuery = '';

  List<dynamic> get _filteredFriends => _searchQuery.isEmpty
      ? _friends
      : _friends.where((item) {
          final name = (item['fullName'] ?? item['name'] ?? '').toString().toLowerCase();
          return name.contains(_searchQuery.toLowerCase());
        }).toList();

  List<dynamic> get _filteredRequests => _searchQuery.isEmpty
      ? _requests
      : _requests.where((item) {
          final name = (item['fromName'] ?? item['fullName'] ?? '').toString().toLowerCase();
          return name.contains(_searchQuery.toLowerCase());
        }).toList();

  List<dynamic> get _filteredSuggestions => _searchQuery.isEmpty
      ? _suggestions
      : _suggestions.where((item) {
          final name = (item['fullName'] ?? item['name'] ?? '').toString().toLowerCase();
          return name.contains(_searchQuery.toLowerCase());
        }).toList();

  List<dynamic> get _filteredSentRequests => _searchQuery.isEmpty
      ? _sentRequests
      : _sentRequests.where((item) {
          final name = (item['toName'] ?? '').toString().toLowerCase();
          return name.contains(_searchQuery.toLowerCase());
        }).toList();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadAll();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    setState(() => _loading = true);
    final f = await _friendService.getFriends();
    final r = await _friendService.getRequests();
    final s = await _friendService.getSuggestions();
    final sent = await _friendService.getSentRequests();
    setState(() {
      _friends = f['success'] ? (f['data'] as List<dynamic>? ?? []) : [];
      _requests = r['success'] ? (r['data'] as List<dynamic>? ?? []) : [];
      _suggestions = s['success'] ? (s['data'] as List<dynamic>? ?? []) : [];
      _sentRequests = sent['success'] ? (sent['data'] as List<dynamic>? ?? []) : [];
      _loading = false;
    });
    // Update pending count badge
    if (mounted) {
      try {
        context.read<FriendProvider>().setPendingCount(_requests.length);
      } catch (_) {}
    }
  }

  Widget _buildAvatar(String? url, String name) {
    if (url != null && url.isNotEmpty) {
      return CircleAvatar(
        radius: 28,
        backgroundImage: NetworkImage(url),
      );
    }
    return CircleAvatar(
      radius: 28,
      child: Text(name.isNotEmpty ? name[0].toUpperCase() : 'U'),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bạn bè'),
        backgroundColor: const Color(0xFF3b82f6),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            const Tab(text: 'Danh sách bạn'),
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Lời mời'),
                  if (_requests.isNotEmpty) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        _requests.length > 99 ? '99+' : '${_requests.length}',
                        style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const Tab(text: 'Gợi ý'),
            Tab(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Đã gửi'),
                  if (_sentRequests.isNotEmpty) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.orange,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${_sentRequests.length}',
                        style: const TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Tìm kiếm...',
                prefixIcon: const Icon(Icons.search, size: 20),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                isDense: true,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide(color: Colors.grey.shade300),
                ),
              ),
              onChanged: (v) => setState(() => _searchQuery = v),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : TabBarView(
              controller: _tabController,
              children: [
          // Friends list
          RefreshIndicator(
            onRefresh: _loadAll,
            child: _filteredFriends.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.people_outline,
                              size: 64, color: Colors.grey.shade300),
                          const SizedBox(height: 16),
                          const Text(
                            'Chưa có bạn bè nào',
                            style: TextStyle(
                                fontSize: 16, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Hãy kết bạn với mọi người trong cộng đồng',
                            style: TextStyle(color: Colors.grey.shade600),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 20),
                          ElevatedButton.icon(
                            onPressed: () =>
                                _tabController.animateTo(2),
                            icon: const Icon(Icons.person_add),
                            label: const Text('Tìm bạn bè'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF3b82f6),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(24)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _filteredFriends.length,
              itemBuilder: (context, index) {
                final item = _filteredFriends[index];
                final name = item['fullName'] ?? item['name'] ?? 'Người dùng';
                final avatar = item['avatar'];
                final mutual = item['mutualCount'] ?? item['mutual'] ?? 0;

                return Card(
                  margin: const EdgeInsets.symmetric(vertical: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        _buildAvatar(avatar, name),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text('$mutual bạn chung', style: const TextStyle(fontSize: 13, color: Colors.grey)),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Flexible(
                                    child: ElevatedButton(
                                      onPressed: () async {
                                        final friendId = (item['id'] ?? item['_id'] ?? item['userId'])?.toString() ?? '';
                                        if (friendId.isEmpty) return;
                                        final chatProvider = context.read<ChatProvider>();
                                        final conv = await chatProvider.createPrivateChat(friendId);
                                        if (conv != null && mounted) {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => ChatDetailScreen(conversation: conv),
                                            ),
                                          );
                                        } else {
                                          Fluttertoast.showToast(msg: chatProvider.error ?? 'Không thể mở chat');
                                        }
                                      },
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF3b82f6),
                                        foregroundColor: Colors.white,
                                        elevation: 0,
                                        padding: const EdgeInsets.symmetric(horizontal: 12),
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                      ),
                                      child: const Text('Nhắn tin'),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Flexible(
                                    child: OutlinedButton(
                                      onPressed: () async {
                                        final res = await _friendService.removeFriend(item['id'] ?? item['_id'] ?? item['userId']);
                                        if (res['success']) {
                                          Fluttertoast.showToast(msg: 'Đã hủy kết bạn');
                                          _loadAll();
                                        } else {
                                          Fluttertoast.showToast(msg: res['message'] ?? 'Lỗi');
                                        }
                                      },
                                      style: OutlinedButton.styleFrom(
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                      ),
                                      child: const Text('Hủy kết bạn'),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Requests
          RefreshIndicator(
            onRefresh: _loadAll,
            child: _filteredRequests.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.mark_email_unread_outlined,
                              size: 64, color: Colors.grey.shade300),
                          const SizedBox(height: 16),
                          const Text(
                            'Không có lời mời nào',
                            style: TextStyle(
                                fontSize: 16, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Các lời mời kết bạn mới sẽ xuất hiện ở đây',
                            style:
                                TextStyle(color: Colors.grey.shade600),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _filteredRequests.length,
              itemBuilder: (context, index) {
                final item = _filteredRequests[index];
                final name = item['fromName'] ?? item['fullName'] ?? 'Người gửi';
                final avatar = item['avatar'] ?? item['fromAvatar'];
                final mutual = item['mutualCount'] ?? 0;

                return Card(
                  margin: const EdgeInsets.symmetric(vertical: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        _buildAvatar(avatar, name),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text('$mutual bạn chung', style: const TextStyle(fontSize: 13, color: Colors.grey)),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Flexible(
                                    child: ElevatedButton(
                                      onPressed: () async {
                                        final res = await _friendService.acceptRequest(item['id'] ?? item['_id'] ?? item['requestId']);
                                        if (res['success']) {
                                          Fluttertoast.showToast(msg: 'Đã chấp nhận');
                                          _loadAll();
                                        } else {
                                          Fluttertoast.showToast(msg: res['message'] ?? 'Lỗi');
                                        }
                                      },
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF3b82f6),
                                        foregroundColor: Colors.white,
                                        elevation: 0,
                                        padding: const EdgeInsets.symmetric(horizontal: 12),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                      ),
                                      child: const Text('Chấp nhận'),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Flexible(
                                    child: OutlinedButton(
                                      onPressed: () async {
                                        final res = await _friendService.rejectRequest(item['id'] ?? item['_id'] ?? item['requestId']);
                                        if (res['success']) {
                                          Fluttertoast.showToast(msg: 'Đã từ chối');
                                          _loadAll();
                                        } else {
                                          Fluttertoast.showToast(msg: res['message'] ?? 'Lỗi');
                                        }
                                      },
                                      style: OutlinedButton.styleFrom(
                                        padding: const EdgeInsets.symmetric(horizontal: 12),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                      ),
                                      child: const Text('Từ chối'),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Suggestions
          RefreshIndicator(
            onRefresh: _loadAll,
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: _filteredSuggestions.length,
              itemBuilder: (context, index) {
                final item = _filteredSuggestions[index];
                final name = item['fullName'] ?? item['name'] ?? 'Người dùng';
                final avatar = item['avatar'];
                final mutual = item['mutualCount'] ?? 0;

                return Card(
                  margin: const EdgeInsets.symmetric(vertical: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        _buildAvatar(avatar, name),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text('$mutual bạn chung', style: const TextStyle(fontSize: 13, color: Colors.grey)),
                              const SizedBox(height: 8),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton(
                                  onPressed: () async {
                                    final res = await _friendService.sendRequest(item['id'] ?? item['_id'] ?? item['userId']);
                                    if (res['success']) {
                                      Fluttertoast.showToast(msg: 'Đã gửi lời mời');
                                      _loadAll();
                                    } else {
                                      Fluttertoast.showToast(msg: res['message'] ?? 'Lỗi');
                                    }
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF2563eb),
                                    foregroundColor: Colors.white,
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                  ),
                                  child: const Text('Thêm bạn bè'),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Sent requests
          RefreshIndicator(
            onRefresh: _loadAll,
            child: _filteredSentRequests.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.send_outlined,
                              size: 64, color: Colors.grey.shade300),
                          const SizedBox(height: 16),
                          const Text(
                            'Chưa gửi lời mời nào',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Các lời mời kết bạn bạn đã gửi sẽ xuất hiện ở đây',
                            style: TextStyle(color: Colors.grey.shade600),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _filteredSentRequests.length,
                    itemBuilder: (context, index) {
                      final item = _filteredSentRequests[index];
                      final name = item['toName'] ?? 'Người dùng';
                      final avatar = item['avatar'];
                      return Card(
                        margin: const EdgeInsets.symmetric(vertical: 8),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Row(
                            children: [
                              _buildAvatar(avatar, name),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      name,
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w600, fontSize: 15),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Đang chờ chấp nhận',
                                      style: TextStyle(
                                          fontSize: 13, color: Colors.orange.shade700),
                                    ),
                                    const SizedBox(height: 8),
                                    SizedBox(
                                      width: double.infinity,
                                      child: OutlinedButton(
                                        onPressed: () async {
                                          final requestId = (item['requestId'] ??
                                                  item['id'] ??
                                                  item['_id'])
                                              ?.toString() ??
                                              '';
                                          if (requestId.isEmpty) return;
                                          final res = await _friendService
                                              .cancelSentRequest(requestId);
                                          if (res['success']) {
                                            Fluttertoast.showToast(
                                                msg: 'Đã thu hồi lời mời');
                                            _loadAll();
                                          } else {
                                            Fluttertoast.showToast(
                                                msg: res['message'] ?? 'Lỗi');
                                          }
                                        },
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: Colors.red,
                                          side: const BorderSide(color: Colors.red),
                                          shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(20)),
                                        ),
                                        child: const Text('Thu hồi lời mời'),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
          ),
        ],
      ),
    );
  }
}