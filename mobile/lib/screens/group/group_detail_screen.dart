import 'package:flutter/material.dart';
import '../../models/group_model.dart';
import '../../models/group_post_model.dart';
import '../home/post_card.dart';
import 'package:provider/provider.dart';
import '../../providers/group_provider.dart';
import '../../providers/auth_provider.dart';
import 'group_settings_screen.dart';
import 'create_post_in_group_screen.dart';
import 'package:fluttertoast/fluttertoast.dart';

class GroupDetailScreen extends StatefulWidget {
  final GroupModel group;
  final String currentUserId;

  const GroupDetailScreen({
    Key? key,
    required this.group,
    required this.currentUserId,
  }) : super(key: key);

  @override
  State<GroupDetailScreen> createState() => _GroupDetailScreenState();
}

class _GroupDetailScreenState extends State<GroupDetailScreen> {
  late GroupModel group;
  bool _isLoading = true;
  bool _isJoined = false;

  /// Map backend role string (from GroupMember table) to Flutter MemberRole enum
  MemberRole _mapApiRoleToMemberRole(String? apiRole, bool isOwner) {
    if (isOwner) return MemberRole.owner;
    if (apiRole == null) return MemberRole.none;
    switch (apiRole.toUpperCase()) {
      case 'ADMIN':
        return MemberRole.owner;
      case 'MODERATOR':
        return MemberRole.admin;
      case 'MEMBER':
        return MemberRole.member;
      default:
        return MemberRole.none;
    }
  }

  @override
  void initState() {
    super.initState();
    group = widget.group;

    // Chạy async SAU khi frame đầu build xong → tránh gọi notifyListeners trong build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _reloadGroupData();
    });
  }

  Future<void> _reloadGroupData() async {
    if (!mounted) return;

    final gp = Provider.of<GroupProvider>(context, listen: false);
    setState(() => _isLoading = true);

    try {
      // Always fetch group detail to get fresh member data with proper user names
      await gp.fetchGroupDetail(group.id);

      final currentUserId = widget.currentUserId.isNotEmpty
          ? widget.currentUserId
          : (Provider.of<AuthProvider>(context, listen: false).user?.id ?? '');

      // Determine membership AFTER fetchGroupDetail returns fresh data
      final joined = gp.currentUserRole != null ||
          gp.groupMembers.any((m) {
            final uid = (m['userId'] ?? m['user_id'] ?? m['id'] ?? m['user']?['_id'] ?? '').toString();
            return uid == currentUserId;
          });

      // Only fetch posts if user is a member — backend returns 403 for non-members
      if (joined) {
        await gp.fetchGroupPosts(group.id, refresh: true, userId: currentUserId.isNotEmpty ? currentUserId : null);
        // Fetch pending posts: admins/mods get all, regular members get their own
        final role = gp.currentUserRole?.toUpperCase();
        if (role == 'ADMIN' || role == 'MODERATOR') {
          await gp.fetchPendingPosts(group.id);
        } else if (currentUserId.isNotEmpty) {
          await gp.fetchMyPendingGroupPosts(group.id, currentUserId);
        }
      }

      if (mounted) {
        setState(() {
          _isJoined = joined;
          _isLoading = false;
        });
      }

      if (gp.groupMembers.isNotEmpty) {
        print('  - First member userId = ${gp.groupMembers.first['userId'] ?? gp.groupMembers.first['user']?['_id']}');
      }
    } catch (e) {
      print('ERROR reload group data: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final gp = Provider.of<GroupProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final currentGroup = gp.currentGroup ?? group;
    final currentUserId = widget.currentUserId.isNotEmpty
        ? widget.currentUserId
        : (authProvider.user?.id ?? '');

    // isOwner = pure role-based, backend không update ownerId khi transfer-admin
    final isOwner = gp.isCurrentUserAdmin;

    // Use provider's currentUserRole (from API) instead of getUserRole (empty members list)
    final userRole = _mapApiRoleToMemberRole(gp.currentUserRole, isOwner);

    // Admin and moderator can see (and manage) the pending posts tab
    final canManagePosts = userRole == MemberRole.owner || userRole == MemberRole.admin;
    final tabCount = 3;

    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Đang tải thông tin nhóm...'),
            ],
          ),
        ),
      );
    }

    return DefaultTabController(
      length: tabCount,
      child: Scaffold(
        backgroundColor: Colors.grey[100],
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 1,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.black),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(
            group.name,
            style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
          ),
          actions: [
            if (_isJoined && canManagePosts)
              IconButton(
                icon: const Icon(Icons.menu, color: Colors.black),
                onPressed: () async {
                  final updatedGroup = await Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => GroupSettingsScreen(
                        group: group,
                        currentUserId: widget.currentUserId,
                      ),
                    ),
                  );
                  if (updatedGroup != null && updatedGroup is GroupModel) {
                    setState(() => group = updatedGroup);
                  }
                },
              ),
          ],
        ),
        body: NestedScrollView(
          headerSliverBuilder: (BuildContext context, bool innerBoxIsScrolled) {
            return <Widget>[
              SliverToBoxAdapter(
                child: Column(
                  children: [
                    Container(
                      height: 180,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        image: currentGroup.coverUrl != null
                            ? DecorationImage(image: NetworkImage(currentGroup.coverUrl!), fit: BoxFit.cover)
                            : null,
                        color: Colors.grey[300],
                      ),
                    ),

                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      color: Colors.white,
                      child: Column(
                        children: [
                          CircleAvatar(
                            radius: 40,
                            backgroundImage: currentGroup.avatar != null
                                ? NetworkImage(currentGroup.avatar!)
                                : null,
                            child: currentGroup.avatar == null
                                ? const Icon(Icons.group, size: 40)
                                : null,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            currentGroup.name,
                            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            "${currentGroup.membersCount} thành viên",
                            style: const TextStyle(color: Colors.grey),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.blue.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              "${userRole.icon} ${userRole.displayName}",
                              style: const TextStyle(color: Colors.blue, fontWeight: FontWeight.w600),
                            ),
                          ),
                          const SizedBox(height: 12),
                          if (currentGroup.description.isNotEmpty)
                            Text(
                              currentGroup.description,
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Colors.black87),
                            ),
                          const SizedBox(height: 16),

                          // Nút hành động - dùng _isJoined
                          if (!_isJoined && gp.isPendingJoinForCurrentGroup)
                            Column(
                              children: [
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                                  decoration: BoxDecoration(
                                    color: Colors.orange.shade50,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: Colors.orange.shade300),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.hourglass_empty, color: Colors.orange.shade700, size: 18),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Đang chờ duyệt',
                                        style: TextStyle(
                                          color: Colors.orange.shade700,
                                          fontWeight: FontWeight.w600,
                                          fontSize: 15,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 8),
                                SizedBox(
                                  width: double.infinity,
                                  child: OutlinedButton.icon(
                                    icon: const Icon(Icons.cancel_outlined, color: Colors.red),
                                    label: const Text('Hủy yêu cầu', style: TextStyle(color: Colors.red)),
                                    style: OutlinedButton.styleFrom(
                                      side: const BorderSide(color: Colors.red),
                                      padding: const EdgeInsets.symmetric(vertical: 12),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    ),
                                    onPressed: _leaveGroup,
                                  ),
                                ),
                              ],
                            )
                          else if (!_isJoined)
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                icon: const Icon(Icons.group_add, color: Colors.white),
                                label: const Text('Tham gia nhóm'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF1877F2),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                onPressed: () => _showJoinConfirmation(context),
                              ),
                            )
                          else
                            Row(
                              children: [
                                Expanded(
                                  child: ElevatedButton.icon(
                                    icon: const Icon(Icons.post_add),
                                    label: const Text("Đăng bài"),
                                    onPressed: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => CreatePostInGroupScreen(
                                            group: currentGroup,
                                            currentUserId: currentUserId,
                                          ),
                                        ),
                                      ).then((value) {
                                        if (value == true) {
                                          gp.fetchGroupPosts(currentGroup.id, refresh: true);
                                          setState(() {});
                                        }
                                      });
                                    },
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: OutlinedButton.icon(
                                    icon: const Icon(Icons.exit_to_app, color: Colors.red),
                                    label: const Text(
                                      "Rời nhóm",
                                      style: TextStyle(color: Colors.red),
                                    ),
                                    onPressed: _leaveGroup,
                                  ),
                                ),
                              ],
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),

                    TabBar(
                      labelColor: Colors.blue,
                      unselectedLabelColor: Colors.grey,
                      indicatorColor: Colors.blue,
                      tabs: [
                        const Tab(text: "Bài viết"),
                        const Tab(text: "Thành viên"),
                        const Tab(text: "Thông tin"),
                      ],
                    ),
                  ],
                ),
              ),
            ];
          },
          body: TabBarView(
            children: [
              _PostsTab(group: currentGroup, currentUserId: currentUserId),
              _MembersTab(group: currentGroup, currentUserId: currentUserId, userRole: userRole),
              _InfoTab(group: currentGroup),
            ],
          ),
        ),
      ),
    );
  }

  void _showJoinConfirmation(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.user;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Tham gia nhóm?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundImage: user?.avatar != null ? NetworkImage(user!.avatar!) : null,
                  child: user?.avatar == null
                      ? Text(user?.fullName?[0] ?? 'U', style: const TextStyle(color: Colors.white))
                      : null,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.fullName ?? user?.username ?? 'Bạn',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                      ),
                      Text(
                        '@${user?.username ?? 'username'}',
                        style: const TextStyle(color: Colors.grey, fontSize: 14),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              'Bạn sẽ tham gia nhóm "${group.name}" với ${group.membersCount} thành viên hiện tại.',
              style: const TextStyle(fontSize: 14),
            ),
            if (group.description.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                group.description,
                style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);

              final gp = Provider.of<GroupProvider>(context, listen: false);
              final res = await gp.joinGroup(group.id, currentUserId: widget.currentUserId);

              if (res['success']) {
                Fluttertoast.showToast(
                  msg: 'Tham gia thành công! 🎉',
                  backgroundColor: Colors.green,
                );

                // Reload toàn bộ để cập nhật isJoined + danh sách thành viên
                await _reloadGroupData();
              } else {
                Fluttertoast.showToast(
                  msg: res['message'] ?? 'Không thể tham gia nhóm',
                  backgroundColor: Colors.red,
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1877F2),
              foregroundColor: Colors.white,
            ),
            child: const Text('Tham gia'),
          ),
        ],
      ),
    );
  }

  void _leaveGroup() {
    final gp = Provider.of<GroupProvider>(context, listen: false);
    final currentUserId = widget.currentUserId.isNotEmpty
        ? widget.currentUserId
        : (Provider.of<AuthProvider>(context, listen: false).user?.id ?? '');

    // Check if user is admin - must transfer admin first
    // Không dùng ownerId vì backend không update ownerId khi transfer
    final isAdmin = gp.isCurrentUserAdmin;

    if (isAdmin) {
      _showTransferAdminBeforeLeave(context);
      return;
    }

    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text("Rời nhóm"),
        content: const Text("Bạn có chắc chắn muốn rời nhóm này không?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Hủy"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              Navigator.pop(context);
              await _performLeaveGroup();
            },
            child: const Text("Rời nhóm"),
          ),
        ],
      ),
    );
  }

  Future<void> _performLeaveGroup() async {
    final gp = Provider.of<GroupProvider>(context, listen: false);
    final currentUserId = widget.currentUserId.isNotEmpty
        ? widget.currentUserId
        : (Provider.of<AuthProvider>(context, listen: false).user?.id ?? '');

    final res = await gp.leaveGroup(group.id, currentUserId: currentUserId);

    if (res['success']) {
      Fluttertoast.showToast(msg: 'Đã rời nhóm', backgroundColor: Colors.green);
      await _reloadGroupData();
      await gp.fetchGroups(authProvider: Provider.of<AuthProvider>(context, listen: false));
      if (mounted) Navigator.pop(context, true);
    } else {
      Fluttertoast.showToast(
        msg: res['message'] ?? 'Không thể rời nhóm',
        backgroundColor: Colors.red,
      );
    }
  }

  void _showTransferAdminBeforeLeave(BuildContext context) {
    final gp = Provider.of<GroupProvider>(context, listen: false);
    final currentUserId = widget.currentUserId.isNotEmpty
        ? widget.currentUserId
        : (Provider.of<AuthProvider>(context, listen: false).user?.id ?? '');

    // Get all non-admin members to transfer to
    final members = gp.groupMembers.where((m) {
      final uid = (m['userId'] ?? m['user_id'] ?? m['user']?['_id'] ?? '').toString();
      return uid != currentUserId;
    }).toList();

    if (members.isEmpty) {
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text("Không thể rời nhóm"),
          content: const Text("Bạn là thành viên duy nhất trong nhóm. Bạn có muốn xóa nhóm không?"),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Hủy"),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
              onPressed: () async {
                Navigator.pop(context);
                final res = await gp.deleteGroup(group.id);
                if (res['success']) {
                  Fluttertoast.showToast(msg: 'Đã xóa nhóm', backgroundColor: Colors.green);
                  if (mounted) Navigator.pop(context, true);
                } else {
                  Fluttertoast.showToast(
                    msg: res['message'] ?? 'Không thể xóa nhóm',
                    backgroundColor: Colors.red,
                  );
                }
              },
              child: const Text("Xóa nhóm"),
            ),
          ],
        ),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text("Chuyển quyền trưởng nhóm"),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "Bạn cần chuyển quyền trưởng nhóm cho một thành viên khác trước khi rời nhóm.",
                style: TextStyle(fontSize: 14, color: Colors.black87),
              ),
              const SizedBox(height: 16),
              const Text("Chọn trưởng nhóm mới:", style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              ConstrainedBox(
                constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.4),
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: members.length,
                  itemBuilder: (context, index) {
                    final m = members[index];
                    final userObj = m['user'] != null ? Map<String, dynamic>.from(m['user'] as Map) : null;
                    final memberId = (m['userId'] ?? m['user_id'] ?? userObj?['_id'] ?? '').toString();
                    final name = (userObj?['fullName'] ?? userObj?['username'] ?? m['fullName'] ?? m['username'] ?? memberId).toString();
                    final avatarUrl = (userObj?['avatarUrl'] ?? userObj?['avatar_url'] ?? userObj?['avatar'] ?? m['avatar_url'] ?? m['avatar'] ?? '').toString();
                    final roleRaw = (m['role']?.toString().toUpperCase() ?? 'MEMBER');

                    return ListTile(
                      leading: CircleAvatar(
                        backgroundImage: avatarUrl.isNotEmpty ? NetworkImage(avatarUrl) : null,
                        child: avatarUrl.isEmpty ? Text(name.isNotEmpty ? name[0].toUpperCase() : 'U') : null,
                      ),
                      title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text(
                        roleRaw == 'MODERATOR' ? 'Quản trị viên' : 'Thành viên',
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                      onTap: () async {
                        Navigator.pop(context);
                        // Transfer admin then leave
                        final transferRes = await gp.transferOwnership(group.id, memberId);
                        if (transferRes['success']) {
                          Fluttertoast.showToast(msg: 'Đã chuyển quyền cho $name', backgroundColor: Colors.green);
                          // Cập nhật local state: user không còn là admin nữa
                          gp.setCurrentUserRole('MODERATOR');
                          // Rời nhóm — bỏ qua kiểm tra admin vì đã chuyển quyền
                          await _performLeaveGroup();
                        } else {
                          Fluttertoast.showToast(
                            msg: transferRes['message'] ?? 'Không thể chuyển quyền',
                            backgroundColor: Colors.red,
                          );
                        }
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Hủy"),
          ),
        ],
      ),
    );
  }
}

////////////////////////////////////////////////////////////

class _PostsTab extends StatelessWidget {
  final GroupModel group;
  final String currentUserId;

  const _PostsTab({
    required this.group,
    required this.currentUserId,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<GroupProvider>(
      builder: (context, gp, child) {
        final groupPosts = gp.getGroupPosts(group.id);

        if (gp.isLoadingPosts) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Đang tải bài viết nhóm...'),
              ],
            ),
          );
        }

        if (groupPosts.isEmpty) {
          return SingleChildScrollView(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                Icon(
                  Icons.article_outlined,
                  size: 80,
                  color: Colors.grey[400],
                ),
                const SizedBox(height: 16),
                Text(
                  'Chưa có bài viết nào trong nhóm',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w500,
                    color: Colors.grey[700],
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Hãy là người đăng bài đầu tiên!',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[600],
                  ),
                ),
                  const SizedBox(height: 24),
                  Builder(builder: (context) {
                    final provider = Provider.of<GroupProvider>(context);

                  // check membership
                  Map<String, dynamic>? memberObj;
                  try {
                    memberObj = provider.groupMembers.firstWhere((m) {
                      final id = (m['userId'] ?? m['user_id'])?.toString() ?? '';
                      return id == currentUserId;
                    }) as Map<String, dynamic>?;
                  } catch (_) {
                    memberObj = null;
                  }

                    final isActiveMember = memberObj != null ||
                        provider.currentUserRole != null ||
                        provider.groupMembers.any((m) {
                          final uid = (m['userId'] ?? m['user_id'])?.toString();
                          return uid == currentUserId;
                        });

                    if (!isActiveMember) {
                      return OutlinedButton.icon(
                        onPressed: () {
                          Fluttertoast.showToast(msg: 'Bạn cần tham gia nhóm để đăng bài');
                        },
                        icon: const Icon(Icons.add),
                        label: const Text('Đăng bài ngay'),
                      );
                    }

                    return OutlinedButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => CreatePostInGroupScreen(
                              group: group,
                              currentUserId: currentUserId,
                            ),
                          ),
                        ).then((value) {
                          if (value == true) {
                            gp.fetchGroupPosts(group.id, refresh: true);
                          }
                        });
                      },
                      icon: const Icon(Icons.add),
                      label: const Text('Đăng bài ngay'),
                    );
                  }),
                ],
              ),
            ),
          ),
        );
        }

        return RefreshIndicator(
          onRefresh: () async {
            await gp.fetchGroupPosts(group.id, refresh: true);
          },
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            itemCount: groupPosts.length,
            itemBuilder: (context, index) {
              final post = groupPosts[index];
              return PostCard(post: post);
            },
          ),
        );
      },
    );
  }

  // Helper: format ngày giờ đơn giản
  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inMinutes < 60) return '${diff.inMinutes} phút trước';
    if (diff.inHours < 24) return '${diff.inHours} giờ trước';
    return '${date.day}/${date.month}/${date.year}';
  }

  // Helper: nút hành động (like, comment, share)
  Widget _buildActionButton(IconData icon, String label) {
    return TextButton.icon(
      onPressed: () {
        // TODO: Xử lý like/comment/share
        Fluttertoast.showToast(msg: 'Tính năng đang phát triển');
      },
      icon: Icon(icon, size: 18, color: Colors.grey[700]),
      label: Text(
        label,
        style: TextStyle(color: Colors.grey[700], fontSize: 13),
      ),
    );
  }
}

class _MembersTab extends StatelessWidget {
  final GroupModel group;
  final String currentUserId;
  final MemberRole userRole;

  const _MembersTab({required this.group, required this.currentUserId, required this.userRole});

  @override
  Widget build(BuildContext context) {
    final gp = Provider.of<GroupProvider>(context);
    final current = gp.currentGroup ?? group;
    final members = gp.groupMembers.isNotEmpty ? gp.groupMembers : current.members;

    // Debug để kiểm tra danh sách thành viên có cập nhật không
    print('DEBUG _MembersTab: members count = ${members.length}');

    if (gp.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (members.isEmpty) {
      return const Center(child: Text('Chưa có thành viên'));
    }

    // Sắp xếp: ADMIN trước, MODERATOR, rồi MEMBER
    final sorted = [...members];
    const roleOrder = {'ADMIN': 0, 'MODERATOR': 1, 'MEMBER': 2};
    sorted.sort((a, b) {
      final aR = (a['role']?.toString().toUpperCase() ?? 'MEMBER');
      final bR = (b['role']?.toString().toUpperCase() ?? 'MEMBER');
      return (roleOrder[aR] ?? 2).compareTo(roleOrder[bR] ?? 2);
    });

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: sorted.length,
      separatorBuilder: (_, __) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final m = sorted[index];
        final Map<String, dynamic>? userObj =
        m['user'] != null ? Map<String, dynamic>.from(m['user'] as Map) : null;

        final String memberId =
            m['userId']?.toString() ??
                m['user_id']?.toString() ??
                userObj?['_id']?.toString() ?? '';

        final String name = (userObj?['fullName'] ??
            userObj?['username'] ??
            m['fullName'] ?? m['username'] ?? memberId).toString();

        final String avatarUrl = (userObj?['avatarUrl'] ??
            userObj?['avatar_url'] ??
            userObj?['avatar'] ??
            m['avatar_url'] ?? m['avatar'] ?? '').toString();

        final String roleRaw =
        (m['role']?.toString().toUpperCase() ?? 'MEMBER');

        // Display purely based on role from backend.
        // Backend: ADMIN = trưởng nhóm hiện tại, MODERATOR = QTV.
        // ownerId không được dùng vì backend không update nó khi transfer-admin.
        final effectiveRole = roleRaw;

        final (String roleLabel, Color roleColor, IconData roleIcon) =
        switch (effectiveRole) {
          'ADMIN' => ('Trưởng nhóm', Colors.amber[700]!, Icons.verified),
          'MODERATOR' => ('Quản trị viên', Colors.blue[600]!, Icons.shield),
          _ => ('Thành viên', Colors.grey[600]!, Icons.person),
        };

        return ListTile(
          leading: CircleAvatar(
            radius: 22,
            backgroundImage:
            avatarUrl.isNotEmpty ? NetworkImage(avatarUrl) : null,
            child: avatarUrl.isEmpty
                ? Text(
              name.isNotEmpty ? name[0].toUpperCase() : 'U',
              style: const TextStyle(fontWeight: FontWeight.bold),
            )
                : null,
          ),
          title: Text(
            name,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          subtitle: Row(
            children: [
              Icon(roleIcon, size: 14, color: roleColor),
              const SizedBox(width: 4),
              Text(
                roleLabel,
                style: TextStyle(
                  color: roleColor,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          trailing: _buildMemberActions(context, gp, current, memberId, name, effectiveRole),
        );
      },
    );
  }

  Widget? _buildMemberActions(BuildContext context, GroupProvider gp, GroupModel current, String memberId, String name, String effectiveRole) {
    // Don't show actions for self
    if (memberId == currentUserId) {
      if (effectiveRole == 'ADMIN') return const Icon(Icons.verified, color: Colors.amber);
      if (effectiveRole == 'MODERATOR') return const Icon(Icons.shield, color: Colors.blue, size: 18);
      return null;
    }

    // Build action list based on current user's role
    final List<PopupMenuEntry<String>> menuItems = [];

    if (userRole == MemberRole.owner) {
      // Group leader (owner) can: promote to mod, demote mod, transfer admin, remove any member
      if (effectiveRole == 'MEMBER') {
        menuItems.add(const PopupMenuItem(value: 'promote_mod', child: ListTile(
          leading: Icon(Icons.shield, color: Colors.blue),
          title: Text('Thăng cấp Quản trị viên'),
          dense: true, contentPadding: EdgeInsets.zero,
        )));
      }
      if (effectiveRole == 'MODERATOR') {
        menuItems.add(const PopupMenuItem(value: 'demote', child: ListTile(
          leading: Icon(Icons.person, color: Colors.orange),
          title: Text('Giáng cấp về Thành viên'),
          dense: true, contentPadding: EdgeInsets.zero,
        )));
      }
      // Owner can transfer admin and remove members (except other admin/owner)
      if (effectiveRole != 'ADMIN') {
        menuItems.add(const PopupMenuItem(value: 'transfer_admin', child: ListTile(
          leading: Icon(Icons.verified, color: Colors.amber),
          title: Text('Chuyển quyền Trưởng nhóm'),
          dense: true, contentPadding: EdgeInsets.zero,
        )));
      }
      // Owner can remove any member except other ADMIN (owner) members
      if (effectiveRole != 'ADMIN') {
        menuItems.add(const PopupMenuItem(value: 'remove', child: ListTile(
          leading: Icon(Icons.remove_circle, color: Colors.red),
          title: Text('Xóa khỏi nhóm'),
          dense: true, contentPadding: EdgeInsets.zero,
        )));
      }
    } else if (userRole == MemberRole.admin) {
      // Admin (MODERATOR in API) can: remove regular members only (NOT other admins or owner)
      if (effectiveRole == 'MEMBER') {
        menuItems.add(const PopupMenuItem(value: 'remove', child: ListTile(
          leading: Icon(Icons.remove_circle, color: Colors.red),
          title: Text('Xóa khỏi nhóm'),
          dense: true, contentPadding: EdgeInsets.zero,
        )));
      }
    }

    if (menuItems.isEmpty) {
      if (effectiveRole == 'ADMIN') return const Icon(Icons.verified, color: Colors.amber);
      if (effectiveRole == 'MODERATOR') return const Icon(Icons.shield, color: Colors.blue, size: 18);
      return null;
    }

    return PopupMenuButton<String>(
      icon: const Icon(Icons.more_vert, color: Colors.grey),
      onSelected: (value) async {
        switch (value) {
          case 'promote_mod':
            final res = await gp.updateGroupMemberRole(current.id, memberId, 'MODERATOR');
            Fluttertoast.showToast(
              msg: res['success'] ? 'Đã thăng cấp $name thành Quản trị viên' : (res['message'] ?? 'Lỗi'),
              backgroundColor: res['success'] ? Colors.green : Colors.red,
            );
            break;
          case 'demote':
            final res = await gp.updateGroupMemberRole(current.id, memberId, 'MEMBER');
            Fluttertoast.showToast(
              msg: res['success'] ? 'Đã giáng cấp $name về Thành viên' : (res['message'] ?? 'Lỗi'),
              backgroundColor: res['success'] ? Colors.green : Colors.red,
            );
            break;
          case 'transfer_admin':
            _showTransferConfirmation(context, gp, current, memberId, name);
            break;
          case 'remove':
            _showRemoveConfirmation(context, gp, current, memberId, name);
            break;
        }
      },
      itemBuilder: (_) => menuItems,
    );
  }

  void _showTransferConfirmation(BuildContext context, GroupProvider gp, GroupModel current, String memberId, String name) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text("Chuyển quyền trưởng nhóm"),
        content: Text("Bạn có chắc chắn muốn chuyển quyền trưởng nhóm cho $name? Bạn sẽ trở thành thành viên thường."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Hủy")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.amber[700]),
            onPressed: () async {
              Navigator.pop(context);
              final res = await gp.transferOwnership(current.id, memberId);
              if (res['success']) {
                gp.setCurrentUserRole('MODERATOR');
              }
              Fluttertoast.showToast(
                msg: res['success'] ? 'Đã chuyển quyền cho $name' : (res['message'] ?? 'Lỗi'),
                backgroundColor: res['success'] ? Colors.green : Colors.red,
              );
            },
            child: const Text("Xác nhận"),
          ),
        ],
      ),
    );
  }

  void _showRemoveConfirmation(BuildContext context, GroupProvider gp, GroupModel current, String memberId, String name) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text("Xóa thành viên"),
        content: Text("Bạn có chắc chắn muốn xóa $name khỏi nhóm?"),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Hủy")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              Navigator.pop(context);
              final res = await gp.removeMember(current.id, memberId);
              Fluttertoast.showToast(
                msg: res['success'] ? 'Đã xóa $name khỏi nhóm' : (res['message'] ?? 'Lỗi'),
                backgroundColor: res['success'] ? Colors.green : Colors.red,
              );
            },
            child: const Text("Xóa"),
          ),
        ],
      ),
    );
  }
}

class _InfoTab extends StatelessWidget {
  final GroupModel group;

  const _InfoTab({required this.group});

  @override
  Widget build(BuildContext context) {
    final gp = Provider.of<GroupProvider>(context);
    final current = gp.currentGroup ?? group;

    // Find owner from gp.groupMembers (fetched from API) first, then fallback to current.members
    final allMembers = gp.groupMembers.isNotEmpty ? gp.groupMembers : current.members;

    Map<String, dynamic>? ownerMember;
    try {
      final found = allMembers.firstWhere((m) {
        final String uid = m['userId']?.toString() ?? m['user_id']?.toString() ?? '';
        final String role = (m['role']?.toString().toUpperCase() ?? '');
        // Match by ownerId OR by ADMIN role
        return uid == current.ownerId || role == 'ADMIN';
      });
      if (found is Map<String, dynamic>) ownerMember = found;
    } catch (_) {
      ownerMember = null;
    }

    String ownerName = 'Không có';
    String ownerAvatar = '';
    if (ownerMember != null) {
      final Map<String, dynamic>? userObj = ownerMember['user'] != null
          ? Map<String, dynamic>.from(ownerMember['user'] as Map)
          : null;
      ownerName = (userObj?['fullName'] ??
          userObj?['username'] ??
          ownerMember['fullName'] ??
          ownerMember['username'] ??
          current.ownerId ??
          'Không có').toString();
      ownerAvatar = (userObj?['avatarUrl'] ??
          userObj?['avatar_url'] ??
          userObj?['avatar'] ??
          ownerMember['avatar_url'] ??
          ownerMember['avatar'] ?? '').toString();
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundImage: ownerAvatar.isNotEmpty ? NetworkImage(ownerAvatar) : null,
                child: ownerAvatar.isEmpty ? Text(ownerName.isNotEmpty ? ownerName[0].toUpperCase() : 'U') : null,
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(ownerName, style: const TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text('Trưởng nhóm', style: TextStyle(color: Colors.grey[700])),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text('Mô tả', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey[800])),
          const SizedBox(height: 6),
          Text(current.description.isNotEmpty ? current.description : 'Chưa có mô tả'),
          const SizedBox(height: 16),
          Text('Số thành viên: ${current.membersCount}'),
          const SizedBox(height: 8),
          if (current.createdAt != null) Text('Tạo ngày: ${current.createdAt}'),
        ],
      ),
    );
  }
}

class _PendingPostsTab extends StatefulWidget {
  final GroupModel group;
  final String currentUserId;
  final bool canManage;

  const _PendingPostsTab({required this.group, required this.currentUserId, this.canManage = false});

  @override
  State<_PendingPostsTab> createState() => _PendingPostsTabState();
}

class _PendingPostsTabState extends State<_PendingPostsTab> {
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadPendingPosts();
    });
  }

  Future<void> _loadPendingPosts() async {
    final gp = Provider.of<GroupProvider>(context, listen: false);
    if (widget.canManage) {
      await gp.fetchPendingPosts(widget.group.id);
    } else {
      await gp.fetchMyPendingGroupPosts(widget.group.id, widget.currentUserId);
    }
    if (mounted) setState(() => _loaded = true);
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<GroupProvider>(
      builder: (context, gp, child) {
        final isLoading = widget.canManage ? gp.isLoadingPendingPosts : gp.isLoadingMyPendingPosts;
        if (isLoading && !_loaded) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Đang tải bài viết chờ duyệt...'),
              ],
            ),
          );
        }

        final pendingPosts = widget.canManage ? gp.pendingPosts : gp.myPendingPosts;

        if (pendingPosts.isEmpty) {
          return SingleChildScrollView(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 48),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.check_circle_outline, size: 80, color: Colors.green[300]),
                    const SizedBox(height: 16),
                    Text(
                      widget.canManage ? 'Không có bài viết nào chờ duyệt' : 'Bạn chưa có bài viết nào chờ duyệt',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500, color: Colors.grey[700]),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      widget.canManage ? 'Tất cả bài viết đã được xử lý' : 'Các bài viết đang chờ duyệt sẽ hiển thị tại đây',
                      style: TextStyle(fontSize: 14, color: Colors.grey[500]),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: _loadPendingPosts,
          child: ListView.builder(
            padding: const EdgeInsets.all(8),
            itemCount: pendingPosts.length,
            itemBuilder: (context, index) {
              final post = pendingPosts[index];
              return _PendingPostCard(
                post: post,
                groupId: widget.group.id,
                canManage: widget.canManage,
              );
            },
          ),
        );
      },
    );
  }
}

class _PendingPostCard extends StatelessWidget {
  final dynamic post;
  final String groupId;
  final bool canManage;

  const _PendingPostCard({required this.post, required this.groupId, this.canManage = false});

  @override
  Widget build(BuildContext context) {
    final String content = post.content ?? '';
    final String authorName = post.userName ?? post.userId ?? 'Người dùng';
    final String? authorAvatar = post.userAvatar;
    final DateTime? createdAt = post.createdAt;

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Author info
            Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundImage: authorAvatar != null && authorAvatar.isNotEmpty
                      ? NetworkImage(authorAvatar)
                      : null,
                  child: authorAvatar == null || authorAvatar.isEmpty
                      ? Text(authorName.isNotEmpty ? authorName[0].toUpperCase() : 'U')
                      : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(authorName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      if (createdAt != null)
                        Text(_formatDate(createdAt), style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text('Chờ duyệt', style: TextStyle(color: Colors.orange, fontSize: 12, fontWeight: FontWeight.w600)),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Post content
            Text(content, style: const TextStyle(fontSize: 15)),

            // Media if any
            if (post.mediaUrls != null && (post.mediaUrls as List).isNotEmpty) ...[
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(
                  (post.mediaUrls as List).first.toString(),
                  fit: BoxFit.cover,
                  width: double.infinity,
                  height: 200,
                  errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                ),
              ),
            ],

            const Divider(height: 24),

            // Approve / Reject buttons (admins/mods only) or status badge (members)
            if (canManage)
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.check, color: Colors.white, size: 20),
                      label: const Text('Duyệt'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () async {
                        final gp = Provider.of<GroupProvider>(context, listen: false);
                        final res = await gp.approveGroupPost(groupId, post.id!);
                        Fluttertoast.showToast(
                          msg: res['success'] ? 'Đã duyệt bài viết!' : (res['message'] ?? 'Lỗi'),
                          backgroundColor: res['success'] ? Colors.green : Colors.red,
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.close, color: Colors.red, size: 20),
                      label: const Text('Từ chối', style: TextStyle(color: Colors.red)),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.red),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () => _showRejectDialog(context),
                    ),
                  ),
                ],
              )
            else
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.hourglass_empty, color: Colors.orange[700], size: 16),
                  const SizedBox(width: 6),
                  Text('Đang chờ admin duyệt', style: TextStyle(color: Colors.orange[700], fontStyle: FontStyle.italic)),
                ],
              ),
          ],
        ),
      ),
    );
  }

  void _showRejectDialog(BuildContext context) {
    final reasonController = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Từ chối bài viết'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Nhập lý do từ chối (không bắt buộc):'),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Lý do...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Hủy')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              Navigator.pop(context);
              final gp = Provider.of<GroupProvider>(context, listen: false);
              final reason = reasonController.text.trim().isEmpty ? null : reasonController.text.trim();
              final res = await gp.rejectGroupPost(groupId, post.id!, reason: reason);
              Fluttertoast.showToast(
                msg: res['success'] ? 'Đã từ chối bài viết!' : (res['message'] ?? 'Lỗi'),
                backgroundColor: res['success'] ? Colors.green : Colors.red,
              );
            },
            child: const Text('Từ chối'),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inMinutes < 60) return '${diff.inMinutes} phút trước';
    if (diff.inHours < 24) return '${diff.inHours} giờ trước';
    return '${date.day}/${date.month}/${date.year}';
  }
}