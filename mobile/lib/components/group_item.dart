// lib/components/group_item.dart

import 'package:flutter/material.dart';
import '../models/group_model.dart';

class GroupItem extends StatelessWidget {
  final GroupModel group;
  final bool isOwner;
  final VoidCallback onTap;
  final VoidCallback? onJoin;

  const GroupItem({super.key, required this.group, this.isOwner = false, required this.onTap, this.onJoin});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundImage: group.avatar != null ? NetworkImage(group.avatar!) : null,
          child: group.avatar == null ? Text(group.name[0]) : null,
        ),
        title: Text(group.name, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('${group.memberCount} thành viên'),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isOwner) const Icon(Icons.star, color: Colors.amber), // Huy hiệu Trưởng nhóm
            if (!group.isJoined && onJoin != null)
              ElevatedButton(
                onPressed: onJoin,
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF3b82f6)),
                child: const Text('Tham gia'),
              ),
          ],
        ),
        onTap: onTap,
      ),
    );
  }
}