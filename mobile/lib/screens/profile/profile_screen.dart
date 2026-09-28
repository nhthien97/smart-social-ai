import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../providers/auth_provider.dart';
import '../../providers/post_provider.dart';
import '../../services/friend_service.dart';
import '../../services/config_service.dart';
import '../home/post_card.dart';
import 'edit_profile_screen.dart';
import 'settings_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final ScrollController _scrollController = ScrollController();
  bool _isLoading = false;
  int _friendsCount = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _reloadProfile();
    });
    _scrollController.addListener(_onScroll);
  }

  Future<void> _reloadProfile() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final postProvider = Provider.of<PostProvider>(context, listen: false);

    setState(() => _isLoading = true);

    try {
      await authProvider.checkAuthStatus();
      final currentUserId = authProvider.user?.id;
      if (currentUserId != null) {
        await Future.wait([
          postProvider.loadProfilePosts(currentUserId, refresh: true),
          _fetchFriendsCount(),
        ]);
      }
    } catch (e) {
      Fluttertoast.showToast(msg: 'Lỗi tải hồ sơ', backgroundColor: Colors.red);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchFriendsCount() async {
    try {
      final result = await FriendService().getFriends(limit: 1000);
      if (result['success'] == true && result['data'] is List && mounted) {
        setState(() => _friendsCount = (result['data'] as List).length);
      }
    } catch (_) {}
  }

  void _onScroll() {
    final postProvider = Provider.of<PostProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final userId = authProvider.user?.id;
    if (_scrollController.position.extentAfter < 300 &&
        !postProvider.profileLoading &&
        postProvider.profileHasMore &&
        userId != null) {
      postProvider.loadProfilePosts(userId);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final postProvider = Provider.of<PostProvider>(context);
    final user = authProvider.user;

    if (user == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final profilePosts = postProvider.profilePosts;
    // Dùng tổng thật từ API, không đếm số bài đã load (phân trang)
    final postsCount = postProvider.profileTotal;
    final likesCount = profilePosts.fold<int>(0, (sum, post) => sum + post.likesCount);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Hồ sơ cá nhân'),
        backgroundColor: const Color(0xFF1877F2),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            tooltip: 'Cài đặt',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const SettingsScreen()),
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _reloadProfile,
        child: NestedScrollView(
          controller: _scrollController,
          headerSliverBuilder: (context, innerBoxIsScrolled) => [
            SliverToBoxAdapter(
              child: Column(
                children: [
                  // Ảnh bìa
                  if (user.cover != null && user.cover!.isNotEmpty)
                    Container(
                      height: 200,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        image: DecorationImage(image: NetworkImage(user.cover!), fit: BoxFit.cover),
                      ),
                    )
                  else
                    Container(height: 200, color: Colors.blue),

                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Trong ProfileScreen → phần CircleAvatar
                        CircleAvatar(
                          radius: 60,
                          backgroundColor: Colors.grey[300], 
                          child: user.avatar != null && user.avatar!.isNotEmpty
                              ? ClipOval(
                                  child: CachedNetworkImage(  
                                    imageUrl: user.avatar!,
                                    width: 120,
                                    height: 120,
                                    fit: BoxFit.cover,
                                    placeholder: (context, url) => const CircularProgressIndicator(),
                                    errorWidget: (context, url, error) => const Icon(
                                      Icons.person,
                                      size: 60,
                                      color: Colors.grey,
                                    ),
                                    cacheKey: user.avatar!,
                                  ),
                                )
                              : Text(
                                  user.fullName?[0]?.toUpperCase() ?? user.username?[0]?.toUpperCase() ?? 'U',
                                  style: const TextStyle(fontSize: 48, color: Colors.white),
                                ),
                        ),
                        const SizedBox(height: 12),

                        Text(
                          user.fullName ?? user.username ?? 'Người dùng',
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                        ),

                        // Bio
                        const SizedBox(height: 8),
                        if (user.bio != null && user.bio!.isNotEmpty)
                          Text(
                            user.bio!,
                            style: const TextStyle(fontSize: 14, color: Colors.black87),
                            textAlign: TextAlign.center,
                          )
                        else
                          const Text(
                            'Chưa có tiểu sử',
                            style: TextStyle(fontSize: 14, color: Colors.grey, fontStyle: FontStyle.italic),
                          ),

                        const SizedBox(height: 16),

                        // Job & Location
                        if (user.job != null && user.job!.isNotEmpty)
                          _buildInfoRow(Icons.work_outline, user.job!)
                        else
                          _buildInfoRow(Icons.work_outline, 'Chưa có công việc'),

                        if (user.location != null && user.location!.isNotEmpty)
                          _buildInfoRow(Icons.location_on_outlined, user.location!)
                        else
                          _buildInfoRow(Icons.location_on_outlined, 'Chưa có vị trí'),

                        if (user.phone != null && user.phone!.isNotEmpty)
                          _buildInfoRow(Icons.phone_outlined, user.phone!),

                        if (user.gender != null && user.gender!.isNotEmpty)
                          _buildInfoRow(
                            Icons.wc_outlined,
                            user.gender == 'male' ? 'Nam' : user.gender == 'female' ? 'Nữ' : 'Khác',
                          ),

                        if (user.birthdate != null)
                          _buildInfoRow(
                            Icons.cake_outlined,
                            '${user.birthdate!.day.toString().padLeft(2, '0')}/${user.birthdate!.month.toString().padLeft(2, '0')}/${user.birthdate!.year}',
                          ),

                        if (user.createdAt != null)
                          _buildInfoRow(
                            Icons.calendar_today_outlined,
                            'Tham gia ${user.createdAt!.month}/${user.createdAt!.year}',
                          ),

                        const SizedBox(height: 24),

                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            _buildStatColumn('$_friendsCount', 'Bạn bè'),
                            _buildStatColumn('$postsCount', 'Bài viết'),
                            _buildStatColumn('$likesCount', 'Lượt thích'),
                          ],
                        ),

                        const SizedBox(height: 24),

                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.edit, size: 18),
                            label: const Text('Chỉnh sửa hồ sơ'),
                            onPressed: () async {
                              final result = await Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => const EditProfileScreen()),
                              );

                              if (result == true && mounted) {
                                // Chỉ reload user info, không cần reload toàn trang
                                await Provider.of<AuthProvider>(context, listen: false).checkAuthStatus();
                                setState(() {});

                                Fluttertoast.showToast(msg: 'Đã cập nhật hồ sơ!', backgroundColor: Colors.green);
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF1877F2),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
          body: _isLoading && profilePosts.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : profilePosts.isEmpty
              ? SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.article_outlined, size: 80, color: Colors.grey[400]),
                        const SizedBox(height: 16),
                        const Text(
                          'Bạn chưa có bài viết nào',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500, color: Colors.grey),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Hãy tạo bài viết đầu tiên!',
                          style: TextStyle(fontSize: 14, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.builder(
                  itemCount: profilePosts.length + (postProvider.profileHasMore ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index == profilePosts.length) {
                      return const Padding(
                        padding: EdgeInsets.all(16),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    }
                    return PostCard(post: profilePosts[index]);
                  },
                ),
        ),
      ),
    );
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

  Widget _buildStatColumn(String number, String label) {
    return Column(
      children: [
        Text(
          number,
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        Text(
          label,
          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }
}