import 'package:flutter/material.dart';
import '../models/group_model.dart';

class RoleBadge extends StatelessWidget {
  final MemberRole role;
  final bool showIcon;
  final double? fontSize;
  final EdgeInsets? padding;

  const RoleBadge({
    super.key,
    required this.role,
    this.showIcon = true,
    this.fontSize = 12,
    this.padding = const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
  });

  Color get _backgroundColor {
    switch (role) {
      case MemberRole.owner:
        return Colors.amber.shade100;
      case MemberRole.admin:
        return Colors.blue.shade100;
      case MemberRole.member:
        return Colors.grey.shade100;
      case MemberRole.none:
        return Colors.red.shade50;
    }
  }

  Color get _textColor {
    switch (role) {
      case MemberRole.owner:
        return Colors.amber.shade900;
      case MemberRole.admin:
        return Colors.blue.shade900;
      case MemberRole.member:
        return Colors.grey.shade800;
      case MemberRole.none:
        return Colors.red.shade800;
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayText = showIcon ? '${role.icon} ${role.shortName}' : role.shortName;

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: _backgroundColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        displayText,
        style: TextStyle(
          fontSize: fontSize,
          fontWeight: FontWeight.w600,
          color: _textColor,
        ),
      ),
    );
  }
}

class RoleBadgeSmall extends StatelessWidget {
  final MemberRole role;

  const RoleBadgeSmall({super.key, required this.role});

  @override
  Widget build(BuildContext context) {
    return RoleBadge(
      role: role,
      showIcon: true,
      fontSize: 10,
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
    );
  }
}
