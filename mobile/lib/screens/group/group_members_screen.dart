// lib/screens/group/group_members_screen.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../providers/auth_provider.dart';
import '../../providers/group_provider.dart';
import '../../components/member_item.dart';
import '../../models/group_model.dart';
import '../profile/public_profile_screen.dart';

class GroupMembersScreen extends StatefulWidget {
  final String groupId;
  final bool isCurrentUserOwner;

  const GroupMembersScreen({
    super.key,
    required this.groupId,
    this.isCurrentUserOwner = false,
  });

  @override
  State<GroupMembersScreen> createState() => _GroupMembersScreenState();
}

class _GroupMembersScreenState extends State<GroupMembersScreen> {
  @override
  Widget build(BuildContext context) {
    final groupProvider = Provider.of<GroupProvider>(context);
    final authProvider = Provider.of<AuthProvider>(context);
    final userId = authProvider.user?.id ?? '';
    final group = groupProvider.currentGroup;
    final members = groupProvider.groupMembers;

    if (group == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (members.isEmpty) {
      return const Center(
        child: Text('Chưa có thành viên nào'),
      );
    }

    // Sắp xếp: Trưởng nhóm trước, rồi quản trị viên, rồi thành viên bình thường
    final sortedMembers = [...members];
    sortedMembers.sort((a, b) {
      final aRole = MemberRole.values.firstWhere(
        (r) => r.name == (a['role'] ?? 'member'),
        orElse: () => MemberRole.member,
      );
      final bRole = MemberRole.values.firstWhere(
        (r) => r.name == (b['role'] ?? 'member'),
        orElse: () => MemberRole.member,
      );

      // Owner first, then admin, then member
      const roleOrder = {
        'owner': 0,
        'admin': 1,
        'member': 2,
      };
      return (roleOrder[aRole.name] ?? 2).compareTo(roleOrder[bRole.name] ?? 2);
    });

    return Scaffold(
      body: ListView.separated(
        itemCount: sortedMembers.length,
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final member = sortedMembers[index];
          final memberRole = MemberRole.values.firstWhere(
            (r) => r.name == (member['role'] ?? 'member'),
            orElse: () => MemberRole.member,
          );

          // Determine if current user is owner or admin
          final isCurrentUserOwner = widget.isCurrentUserOwner;
          final isCurrentUserAdmin = groupProvider.isCurrentUserAdmin;
          final memberUserId = (member['userId'] ?? member['user_id'] ?? member['id'] ?? member['user']?['_id'] ?? '').toString();
          final isSelf = memberUserId == userId;

          // Permission: who can remove this member
          bool canRemove = false;
          if (isCurrentUserOwner && !isSelf && memberRole != MemberRole.owner) {
            // Owner can remove anyone except themselves and other owners
            canRemove = true;
          } else if (isCurrentUserAdmin && !isSelf && memberRole == MemberRole.member) {
            // Admin can only remove regular members
            canRemove = true;
          }

          return MemberItem(
            member: member,
            isCurrentUserOwner: widget.isCurrentUserOwner,
            onTapProfile: () {
              final memberId = member['userId'] as String?;
              if (memberId != null && memberId.isNotEmpty) {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => PublicProfileScreen(userId: memberId),
                  ),
                );
              }
            },
            onRemove: canRemove
                ? () => _showRemoveConfirmation(
                      context,
                      member['fullName'] ?? member['username'] ?? 'User',
                      member['userId'],
                      groupProvider,
                    )
                : null,
            onMakeAdmin: widget.isCurrentUserOwner &&
                    memberRole == MemberRole.member
                ? () => _makeAdmin(
                      context,
                      member['userId'],
                      groupProvider,
                    )
                : null,
            onRemoveAdmin: widget.isCurrentUserOwner &&
                    memberRole == MemberRole.admin
                ? () => _removeAdmin(
                      context,
                      member['userId'],
                      groupProvider,
                    )
                : null,
            onTransfer: widget.isCurrentUserOwner &&
                    memberRole != MemberRole.owner
                ? () => _showTransferConfirmation(
                      context,
                      member['fullName'] ?? member['username'] ?? 'User',
                      member['userId'],
                      groupProvider,
                    )
                : null,
          );
        },
      ),
      floatingActionButton: widget.isCurrentUserOwner
          ? FloatingActionButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Tính năng thêm thành viên sắp có'),
                  ),
                );
              },
              tooltip: 'Thêm thành viên',
              child: const Icon(Icons.person_add),
            )
          : null,
    );
  }

  void _showRemoveConfirmation(
    BuildContext context,
    String memberName,
    String memberId,
    GroupProvider groupProvider,
  ) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Xóa thành viên?'),
        content: Text(
          'Bạn có chắc muốn xóa $memberName khỏi nhóm?\n\nHành động này không thể hoàn tác.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              final result = await groupProvider.removeMember(
                widget.groupId,
                memberId,
              );
              if (result['success']) {
                Fluttertoast.showToast(
                  msg: 'Xóa thành viên thành công!',
                  backgroundColor: Colors.green,
                );
                await groupProvider.fetchGroupDetail(widget.groupId);
              } else {
                final statusCode = result['statusCode'] as int?;
                String errorMsg = result['message'] ?? 'Lỗi xóa thành viên';
                
                if (statusCode == 403) {
                  showDialog(
                    context: context,
                    builder: (_) => AlertDialog(
                      title: const Text('⚠️ Không có quyền'),
                      content: Text(errorMsg),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('OK'),
                        ),
                      ],
                    ),
                  );
                } else {
                  Fluttertoast.showToast(
                    msg: errorMsg,
                    backgroundColor: Colors.red,
                  );
                }
              }
            },
            style:
                ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Xóa'),
          ),
        ],
      ),
    );
  }

  void _showTransferConfirmation(
    BuildContext context,
    String memberName,
    String memberId,
    GroupProvider groupProvider,
  ) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Chuyển quyền trưởng nhóm?'),
        content: Text(
          'Bạn sắp chuyển quyền trưởng nhóm cho $memberName.\n\nBạn sẽ trở thành thành viên bình thường.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              final result = await groupProvider.transferOwnership(
                widget.groupId,
                memberId,
              );
              if (result['success']) {
                Fluttertoast.showToast(
                  msg: 'Chuyển quyền thành công!',
                  backgroundColor: Colors.green,
                );
                await groupProvider.fetchGroupDetail(widget.groupId);
              } else {
                final statusCode = result['statusCode'] as int?;
                String errorMsg = result['message'] ?? 'Lỗi chuyển quyền';
                
                if (statusCode == 403) {
                  showDialog(
                    context: context,
                    builder: (_) => AlertDialog(
                      title: const Text('⚠️ Không có quyền'),
                      content: Text(errorMsg),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('OK'),
                        ),
                      ],
                    ),
                  );
                } else {
                  Fluttertoast.showToast(
                    msg: errorMsg,
                    backgroundColor: Colors.red,
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange,
            ),
            child: const Text('Chuyển'),
          ),
        ],
      ),
    );
  }

  void _makeAdmin(
    BuildContext context,
    String memberId,
    GroupProvider groupProvider,
  ) async {
    final result = await groupProvider.updateGroupMemberRole(
      widget.groupId,
      memberId,
      'MODERATOR',
    );
    if (result['success']) {
      Fluttertoast.showToast(
        msg: 'Cấp quyền Quản trị thành công!',
        backgroundColor: Colors.green,
      );
      await groupProvider.fetchGroupDetail(widget.groupId);
    } else {
      final statusCode = result['statusCode'] as int?;
      String errorMsg = result['message'] ?? 'Lỗi cấp quyền';
      
      if (statusCode == 403) {
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('⚠️ Không có quyền'),
            content: Text(errorMsg),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      } else {
        Fluttertoast.showToast(
          msg: errorMsg,
          backgroundColor: Colors.red,
        );
      }
    }
  }

  void _removeAdmin(
    BuildContext context,
    String memberId,
    GroupProvider groupProvider,
  ) async {
    final result = await groupProvider.updateGroupMemberRole(
      widget.groupId,
      memberId,
      'MEMBER',
    );
    if (result['success']) {
      Fluttertoast.showToast(
        msg: 'Gỡ quyền Quản trị thành công!',
        backgroundColor: Colors.green,
      );
      await groupProvider.fetchGroupDetail(widget.groupId);
    } else {
      final statusCode = result['statusCode'] as int?;
      String errorMsg = result['message'] ?? 'Lỗi gỡ quyền';
      
      if (statusCode == 403) {
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('⚠️ Không có quyền'),
            content: Text(errorMsg),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      } else {
        Fluttertoast.showToast(
          msg: errorMsg,
          backgroundColor: Colors.red,
        );
      }
    }
  }
}
