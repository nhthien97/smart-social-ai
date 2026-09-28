// lib/components/member_item.dart

import 'package:flutter/material.dart';
import '../models/group_model.dart';
import 'role_badge.dart';

class MemberItem extends StatelessWidget {
  final Map<String, dynamic> member;
  final bool isCurrentUserOwner;
  final VoidCallback? onRemove;
  final VoidCallback? onMakeAdmin;
  final VoidCallback? onRemoveAdmin;
  final VoidCallback? onTransfer;
  final VoidCallback? onTapProfile;

  const MemberItem({
    super.key,
    required this.member,
    this.isCurrentUserOwner = false,
    this.onRemove,
    this.onMakeAdmin,
    this.onRemoveAdmin,
    this.onTransfer,
    this.onTapProfile,
  });

  @override
  Widget build(BuildContext context) {
    final role = MemberRole.values.firstWhere(
      (r) => r.name == (member['role'] ?? 'member'),
      orElse: () => MemberRole.member,
    );
    
    final userId = member['userId'] as String?;
    final fullName = member['fullName'] ?? member['username'] ?? 'User';
    final avatar = member['avatar'];
    final email = member['email'] as String?;

    return Material(
      child: ListTile(
        onTap: onTapProfile,
        leading: CircleAvatar(
          backgroundColor: Colors.blue.shade200,
          backgroundImage: avatar != null ? NetworkImage(avatar) : null,
          child: avatar == null ? Text(fullName[0].toUpperCase()) : null,
        ),
        title: Row(
          children: [
            Expanded(child: Text(fullName)),
            const SizedBox(width: 8),
            RoleBadgeSmall(role: role),
          ],
        ),
        subtitle: email != null ? Text(email, maxLines: 1, overflow: TextOverflow.ellipsis) : null,
        trailing: isCurrentUserOwner && role != MemberRole.owner
            ? PopupMenuButton<String>(
                onSelected: (value) {
                  if (value == 'remove') {
                    onRemove?.call();
                  } else if (value == 'make_admin' && onMakeAdmin != null) {
                    onMakeAdmin?.call();
                  } else if (value == 'remove_admin' && onRemoveAdmin != null) {
                    onRemoveAdmin?.call();
                  } else if (value == 'transfer' && onTransfer != null) {
                    onTransfer?.call();
                  }
                },
                itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
                  if (role == MemberRole.member && onMakeAdmin != null)
                    const PopupMenuItem<String>(
                      value: 'make_admin',
                      child: Row(
                        children: [Icon(Icons.shield), SizedBox(width: 8), Text('Cấp quyền Quản trị')],
                      ),
                    ),
                  if (role == MemberRole.admin && onRemoveAdmin != null)
                    const PopupMenuItem<String>(
                      value: 'remove_admin',
                      child: Row(
                        children: [Icon(Icons.security), SizedBox(width: 8), Text('Gỡ quyền Quản trị')],
                      ),
                    ),
                  if (onTransfer != null)
                    const PopupMenuItem<String>(
                      value: 'transfer',
                      child: Row(
                        children: [Icon(Icons.swap_horiz), SizedBox(width: 8), Text('Chuyển quyền Trưởng nhóm')],
                      ),
                    ),
                  const PopupMenuDivider(),
                  const PopupMenuItem<String>(
                    value: 'remove',
                    child: Row(
                      children: [
                        Icon(Icons.delete, color: Colors.red),
                        SizedBox(width: 8),
                        Text('Xóa khỏi group', style: TextStyle(color: Colors.red))
                      ],
                    ),
                  ),
                ],
              )
            : null,
      ),
    );
  }
}
