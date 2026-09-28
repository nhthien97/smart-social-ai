// lib/screens/group/create_group_screen.dart

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:image_picker/image_picker.dart';

import '../../providers/group_provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/cloudinary_service.dart';

class CreateGroupScreen extends StatefulWidget {
  const CreateGroupScreen({super.key});

  @override
  State<CreateGroupScreen> createState() => _CreateGroupScreenState();
}

class _CreateGroupScreenState extends State<CreateGroupScreen> {
  final _nameController = TextEditingController();
  final _descController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  File? _newAvatar;
  File? _newCover;
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    super.dispose();
  }

  void _showErrorDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(title),
        content: SingleChildScrollView(
          child: Text(message),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Future<void> _createGroup() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final groupProvider = Provider.of<GroupProvider>(context, listen: false);
      final authProvider = Provider.of<AuthProvider>(context, listen: false);

      String? avatarUrl;
      String? coverUrl;

      if (_newAvatar != null) {
        avatarUrl = await CloudinaryService().uploadImage(_newAvatar!.path);
        if (avatarUrl == null) {
          Fluttertoast.showToast(msg: 'Upload avatar thất bại', backgroundColor: Colors.orange);
        }
      }
      if (_newCover != null) {
        coverUrl = await CloudinaryService().uploadImage(_newCover!.path);
        if (coverUrl == null) {
          Fluttertoast.showToast(msg: 'Upload cover thất bại', backgroundColor: Colors.orange);
        }
      }

      final result = await groupProvider.createGroup(
        _nameController.text.trim(),
        _descController.text.trim(),
        avatarUrl,
        coverUrl: coverUrl,
        ownerId: authProvider.user?.id,
      );

      if (!mounted) return;

      if (result['success']) {
        // Đã thêm nhóm vào state cục bộ (đảm bảo creator là owner).
        // Không gọi fetchGroups ngay để tránh ghi đè owner nếu backend chưa set.
        if (!mounted) return;
        Fluttertoast.showToast(
          msg: 'Tạo nhóm thành công! 🎉',
          backgroundColor: Colors.green,
        );
        Navigator.pop(context, true); // Trả về true để báo đã tạo thành công
      } else {
        final statusCode = result['statusCode'] as int?;
        final message = result['message'] ?? 'Lỗi không xác định';

        String fullMessage = message;
        if (statusCode == 401) {
          fullMessage = '🔐 Phiên hết hạn. Vui lòng đăng nhập lại.';
        } else if (statusCode == 403) {
          fullMessage = '⚠️ Bạn không có quyền tạo nhóm.\n\nChi tiết: $message';
        } else if (statusCode == 400) {
          fullMessage = '❌ Dữ liệu không hợp lệ.\n\nChi tiết: $message';
        } else if (statusCode == 500) {
          fullMessage = '⚠️ Lỗi máy chủ.\n\nVui lòng thử lại sau.\n\nChi tiết: $message';
        }

        _showErrorDialog('Lỗi tạo nhóm', fullMessage);
      }
    } catch (e) {
      if (!mounted) return;
      _showErrorDialog(
        'Lỗi không mong muốn',
        'Đã xảy ra lỗi khi tạo nhóm:\n\n$e',
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tạo nhóm mới'),
        backgroundColor: const Color(0xFF3b82f6),
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Info card
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  border: Border.all(color: Colors.blue.shade200),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.info_outline, color: Color(0xFF3b82f6)),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Bạn sẽ tự động trở thành trưởng nhóm 👑',
                        style: TextStyle(fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Cover image
              Stack(
                children: [
                  Container(
                    height: 120,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      image: _newCover != null
                          ? DecorationImage(image: FileImage(_newCover!), fit: BoxFit.cover)
                          : null,
                    ),
                  ),
                  Positioned(
                    bottom: 8,
                    right: 8,
                    child: IconButton(
                      icon: const Icon(Icons.camera_alt, color: Colors.white),
                      onPressed: _isLoading
                          ? null
                          : () async {
                              final picker = ImagePicker();
                              final picked = await picker.pickImage(source: ImageSource.gallery);
                              if (picked != null) {
                                setState(() => _newCover = File(picked.path));
                              }
                            },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Avatar
              Center(
                child: Stack(
                  children: [
                    CircleAvatar(
                      radius: 36,
                      backgroundImage: _newAvatar != null
                          ? FileImage(_newAvatar!)
                          : null,
                      child: _newAvatar == null
                          ? const Icon(Icons.group, size: 36)
                          : null,
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: IconButton(
                        icon: const Icon(Icons.camera_alt),
                        onPressed: _isLoading
                            ? null
                            : () async {
                                final picker = ImagePicker();
                                final picked = await picker.pickImage(source: ImageSource.gallery);
                                if (picked != null) {
                                  setState(() => _newAvatar = File(picked.path));
                                }
                              },
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Tên nhóm
              TextFormField(
                controller: _nameController,
                enabled: !_isLoading,
                decoration: InputDecoration(
                  labelText: 'Tên nhóm *',
                  hintText: 'Nhập tên nhóm',
                  prefixIcon: const Icon(Icons.group),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Tên nhóm không thể trống';
                  }
                  if (value.length < 3) {
                    return 'Tên nhóm phải ít nhất 3 ký tự';
                  }
                  if (value.length > 50) {
                    return 'Tên nhóm không vượt quá 50 ký tự';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Mô tả
              TextFormField(
                controller: _descController,
                enabled: !_isLoading,
                maxLines: 4,
                decoration: InputDecoration(
                  labelText: 'Mô tả',
                  hintText: 'Nhập mô tả nhóm (tùy chọn)',
                  prefixIcon: const Icon(Icons.description),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                validator: (value) {
                  if (value != null && value.length > 500) {
                    return 'Mô tả không vượt quá 500 ký tự';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 32),

              // Nút tạo
              ElevatedButton(
                onPressed: _isLoading ? null : _createGroup,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: const Color(0xFF3b82f6),
                  disabledBackgroundColor: Colors.grey[400],
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor:
                              AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Text(
                        'Tạo nhóm',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
