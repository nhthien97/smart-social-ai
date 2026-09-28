// lib/screens/group/group_info_screen.dart

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/group_model.dart';

class GroupInfoScreen extends StatelessWidget {
  final GroupModel? group;

  const GroupInfoScreen({super.key, this.group});

  @override
  Widget build(BuildContext context) {
    if (group == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final dateFormat = DateFormat('dd/MM/yyyy');
    final createdDate = group!.createdAt != null
        ? dateFormat.format(group!.createdAt!)
        : 'Không xác định';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Mô tả nhóm
          const Text(
            'Mô tả',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey[50],
              border: Border.all(color: Colors.grey[300]!),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              group!.description.isEmpty
                  ? '(Chưa có mô tả)'
                  : group!.description,
              style: TextStyle(
                fontSize: 14,
                color: group!.description.isEmpty
                    ? Colors.grey
                    : Colors.black87,
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Thông tin nhóm
          const Text(
            'Thông tin',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          _buildInfoRow(Icons.people, 'Thành viên', '${group!.memberCount}'),
          const SizedBox(height: 8),
          _buildInfoRow(Icons.calendar_today, 'Ngày tạo', createdDate),
          const SizedBox(height: 24),

          // Quy tắc nhóm
          const Text(
            'Quy tắc nhóm',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          _buildPermissionInfo(),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, color: Colors.blue, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.grey,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPermissionInfo() {
    return Column(
      children: [
        _buildPermissionCard(
          '👑 Trưởng nhóm',
          [
            'Thêm & xóa thành viên',
            'Chỉ định Quản trị viên',
            'Chỉnh sửa thông tin nhóm',
            'Xóa nhóm',
            'Chuyển quyền Trưởng nhóm',
          ],
        ),
        const SizedBox(height: 12),
        _buildPermissionCard(
          '🛡️ Quản trị viên',
          [
            'Thêm thành viên mới',
            'Xóa thành viên',
            'Chỉnh sửa thông tin nhóm',
            'Đăng bài & quản lý bài viết',
          ],
        ),
        const SizedBox(height: 12),
        _buildPermissionCard(
          '👤 Thành viên',
          [
            'Xem bài viết nhóm',
            'Bình luận & thích bài viết',
            'Rời nhóm',
          ],
        ),
      ],
    );
  }

  Widget _buildPermissionCard(String title, List<String> permissions) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        border: Border.all(color: Colors.grey[300]!),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          ...permissions
              .map(
                (p) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Row(
                    children: [
                      const Text('• ', style: TextStyle(color: Colors.green)),
                      Expanded(
                        child: Text(
                          p,
                          style: const TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              )
              .toList(),
        ],
      ),
    );
  }
}
