// lib/screens/group/create_post_in_group_screen.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:typed_data';
import 'package:fluttertoast/fluttertoast.dart';

import '../../models/group_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/group_provider.dart';
import '../../services/cloudinary_service.dart';
import '../../services/post_service.dart';
import '../../services/api_service.dart';
import '../../services/config_service.dart';

class CreatePostInGroupScreen extends StatefulWidget {
  final GroupModel group;
  final String currentUserId;

  const CreatePostInGroupScreen({
    super.key,
    required this.group,
    required this.currentUserId,
  });

  @override
  State<CreatePostInGroupScreen> createState() => _CreatePostInGroupScreenState();
}

class _CreatePostInGroupScreenState extends State<CreatePostInGroupScreen> {
  final TextEditingController _contentController = TextEditingController();
  final List<XFile> _selectedImages = [];
  final CloudinaryService _cloudinaryService = CloudinaryService();
  bool _isUploading = false;
  final ImagePicker _picker = ImagePicker();

  // ── Tags ──────────────────────────────────────────────────────────────
  List<Map<String, dynamic>> _categoryGroups = [];
  final List<String> _selectedTags = [];
  bool _loadingCategories = true;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  Future<void> _loadCategories() async {
    try {
      await ApiService().loadToken();
      final service = PostService(ApiService().dio);
      final groups = await service.getCategories();
      if (mounted) {
        setState(() {
          _categoryGroups = groups;
          _loadingCategories = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loadingCategories = false);
        Fluttertoast.showToast(
          msg: 'Không tải được danh sách chủ đề',
          backgroundColor: Colors.red,
        );
      }
    }
  }

  @override
  void dispose() {
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    try {
      // Get allowed image count from config
      int maxImages = 10;
      try {
        maxImages = await ConfigService().getMaxImagesPerPost();
      } catch (_) {
        maxImages = 10;
      }

      final List<XFile> images = await _picker.pickMultiImage(imageQuality: 85);
      if (images.isEmpty) return;
      final remaining = maxImages - _selectedImages.length;
      if (remaining <= 0) {
        Fluttertoast.showToast(
          msg: 'Đã đạt giới hạn $maxImages ảnh',
          backgroundColor: Colors.orange,
        );
        return;
      }
      final toAdd = images.take(remaining).toList();
      setState(() {
        _selectedImages.addAll(toAdd);
      });
      if (images.length > remaining) {
        Fluttertoast.showToast(
          msg: 'Chỉ thêm được $remaining ảnh (giới hạn $maxImages)',
          backgroundColor: Colors.orange,
        );
      }
    } catch (e) {
      Fluttertoast.showToast(
        msg: 'Lỗi khi chọn ảnh',
        backgroundColor: Colors.red,
      );
    }
  }

  Future<void> _pickCamera() async {
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
      if (image != null) {
        setState(() {
          _selectedImages.add(image);
        });
      }
    } catch (e) {
      Fluttertoast.showToast(
        msg: 'Lỗi khi chụp ảnh',
        backgroundColor: Colors.red,
      );
    }
  }

  void _removeImage(int index) {
    setState(() {
      _selectedImages.removeAt(index);
    });
  }

  Future<void> _createPost() async {
    final content = _contentController.text.trim();

    if (content.isEmpty && _selectedImages.isEmpty) {
      Fluttertoast.showToast(
        msg: 'Vui lòng nhập nội dung hoặc chọn ảnh',
        backgroundColor: Colors.orange,
      );
      return;
    }

    if (_selectedTags.isEmpty) {
      Fluttertoast.showToast(
        msg: 'Vui lòng chọn ít nhất 1 chủ đề (tag)',
        backgroundColor: Colors.orange,
      );
      return;
    }

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final groupProvider = Provider.of<GroupProvider>(context, listen: false);

    final currentUser = authProvider.user;
    final userId = currentUser?.id;

    if (userId == null) {
      Fluttertoast.showToast(msg: 'Vui lòng đăng nhập', backgroundColor: Colors.red);
      return;
    }

    setState(() => _isUploading = true);

    try {
      // config-based client checks
      final maxLen = await ConfigService().getMaxPostLength();
      if (content.length > maxLen) {
        Fluttertoast.showToast(
          msg: 'Nội dung quá dài (tối đa $maxLen ký tự)',
          backgroundColor: Colors.orange,
        );
        return;
      }

      List<String>? mediaUrls;

      if (_selectedImages.isNotEmpty) {
        final allowedMb = await ConfigService().getMaxUploadSizeMb();
        final allowedBytes = allowedMb * 1024 * 1024;
        for (final f in _selectedImages) {
          final bytes = await f.readAsBytes();
          if (bytes.length > allowedBytes) {
            final mb = (bytes.length / 1024 / 1024).toStringAsFixed(1);
            throw Exception('Ảnh quá lớn (${mb}MB). Vui lòng chọn ảnh dưới ${allowedMb}MB.');
          }
        }
        mediaUrls = await _cloudinaryService.uploadMultipleXFiles(_selectedImages);
        if (mediaUrls.isEmpty) {
          throw Exception('Không thể upload ảnh');
        }
      }

      final createdPost = await groupProvider.createGroupPost(
        widget.group.id,
        content: content,
        mediaUrls: mediaUrls,
        tags: _selectedTags,
      );

      if (createdPost != null) {
        // Tạo tên hiển thị: ưu tiên fullName → username → fallback
        final displayName = currentUser?.fullName?.isNotEmpty == true
            ? currentUser!.fullName!
            : (currentUser?.username?.isNotEmpty == true
            ? currentUser!.username!
            : 'Bạn');

        // SỬA LỖI: chỉ dùng userName (tham số có sẵn trong model), không dùng username
        final filledPost = createdPost.copyWith(
          userName: displayName,                    // ← đúng tên tham số
          userAvatar: currentUser?.avatar,
          userId: userId,
        );

        // Cập nhật vào cache để hiển thị ngay
        groupProvider.addPostToGroup(widget.group.id, filledPost);

        // Debug để kiểm tra (xem console khi chạy)
        print('DEBUG: Tên sau fill = ${filledPost.userName}');
        print('DEBUG: Avatar = ${filledPost.userAvatar}');

        Fluttertoast.showToast(
          msg: 'Đăng bài trong nhóm thành công!',
          backgroundColor: Colors.green,
        );

        if (mounted) Navigator.pop(context, true);
      } else {
        throw Exception('Không thể đăng bài');
      }
    } catch (e) {
      Fluttertoast.showToast(
        msg: 'Lỗi: ${e.toString()}',
        backgroundColor: Colors.red,
      );
    } finally {
      if (mounted) {
        setState(() => _isUploading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    return Scaffold(
      appBar: AppBar(
        title: Text('Đăng trong: ${widget.group.name}'),
        actions: [
          TextButton(
            onPressed: _isUploading ? null : _createPost,
            child: _isUploading
                ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
                : const Text(
              'Đăng',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Color(0xFF3b82f6),
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // User info + Group info
            Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: const Color(0xFF3b82f6),
                  child: user?.avatar != null
                      ? ClipOval(
                    child: Image.network(
                      user!.avatar!,
                      width: 48,
                      height: 48,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Text(
                          user.fullName?.substring(0, 1).toUpperCase() ?? 'U',
                          style: const TextStyle(fontSize: 20, color: Colors.white),
                        );
                      },
                    ),
                  )
                      : Text(
                    user?.fullName?.substring(0, 1).toUpperCase() ?? 'U',
                    style: const TextStyle(fontSize: 20, color: Colors.white),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.fullName ?? 'Người dùng',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Đăng trong nhóm: ${widget.group.name}',
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Content input
            TextField(
              controller: _contentController,
              maxLines: null,
              decoration: const InputDecoration(
                hintText: 'Bạn đang nghĩ gì trong nhóm này?',
                border: InputBorder.none,
              ),
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 12),

            // ── Tag selector ─────────────────────────────────────────
            _buildTagSelector(),
            const SizedBox(height: 16),

            // Selected images preview
            if (_selectedImages.isNotEmpty)
              SizedBox(
                height: 120,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _selectedImages.length,
                  itemBuilder: (context, index) {
                    return Stack(
                      children: [
                        FutureBuilder<Uint8List>(
                          future: _selectedImages[index].readAsBytes(),
                          builder: (context, snapshot) {
                            return Container(
                              width: 120,
                              height: 120,
                              margin: const EdgeInsets.only(right: 8),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(8),
                                color: Colors.grey.shade200,
                              ),
                              child: snapshot.hasData
                                  ? ClipRRect(
                                      borderRadius: BorderRadius.circular(8),
                                      child: Image.memory(
                                        snapshot.data!,
                                        fit: BoxFit.cover,
                                        width: 120,
                                        height: 120,
                                      ),
                                    )
                                  : const Center(
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    ),
                            );
                          },
                        ),
                        Positioned(
                          top: 4,
                          right: 12,
                          child: GestureDetector(
                            onTap: () => _removeImage(index),
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: const BoxDecoration(
                                color: Colors.black54,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.close, size: 16, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),

            const SizedBox(height: 16),

            // Add media buttons
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade300),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  TextButton.icon(
                    onPressed: _isUploading ? null : _pickImages,
                    icon: const Icon(Icons.photo_library, color: Color(0xFF10b981)),
                    label: const Text('Ảnh/Video', style: TextStyle(color: Colors.black87)),
                  ),
                  TextButton.icon(
                    onPressed: _isUploading ? null : _pickCamera,
                    icon: const Icon(Icons.camera_alt, color: Color(0xFF3b82f6)),
                    label: const Text('Camera', style: TextStyle(color: Colors.black87)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Tag selector widget (same as CreatePostScreen) ────────────────────
  Widget _buildTagSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.label_outline, size: 18, color: Color(0xFF3b82f6)),
            const SizedBox(width: 6),
            const Text('Chủ đề',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(width: 4),
            Text('(${_selectedTags.length}/3)',
              style: TextStyle(fontSize: 12, color: Colors.grey[600])),
          ],
        ),
        const SizedBox(height: 8),
        if (_selectedTags.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Wrap(
              spacing: 6, runSpacing: 6,
              children: _selectedTags.map((slug) {
                final cat = _findCategory(slug);
                return Chip(
                  label: Text('${cat?['icon'] ?? '🏷️'} ${cat?['name'] ?? slug}',
                    style: const TextStyle(fontSize: 12)),
                  deleteIcon: const Icon(Icons.close, size: 16),
                  onDeleted: () => setState(() => _selectedTags.remove(slug)),
                  backgroundColor: const Color(0xFF3b82f6).withValues(alpha: 0.1),
                  side: const BorderSide(color: Color(0xFF3b82f6), width: 0.5),
                );
              }).toList(),
            ),
          ),
        InkWell(
          onTap: _selectedTags.length >= 3 ? null : _showTagPicker,
          borderRadius: BorderRadius.circular(8),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              border: Border.all(color: _selectedTags.isEmpty ? Colors.red.shade200 : Colors.grey.shade300),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(Icons.add_circle_outline, size: 20,
                  color: _selectedTags.length >= 3 ? Colors.grey : const Color(0xFF3b82f6)),
                const SizedBox(width: 8),
                Text(
                  _selectedTags.isEmpty ? 'Chọn ít nhất 1 chủ đề *' : 'Thêm chủ đề',
                  style: TextStyle(
                    color: _selectedTags.isEmpty ? Colors.red.shade400 : Colors.grey[600],
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Map<String, dynamic>? _findCategory(String slug) {
    for (final group in _categoryGroups) {
      final categories = group['items'] as List? ?? [];
      for (final cat in categories) {
        if (cat['slug'] == slug) return Map<String, dynamic>.from(cat);
      }
    }
    return null;
  }

  void _showTagPicker() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return DraggableScrollableSheet(
              expand: false,
              initialChildSize: 0.65,
              maxChildSize: 0.85,
              minChildSize: 0.4,
              builder: (_, scrollCtrl) {
                return Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                      child: Row(
                        children: [
                          const Icon(Icons.label, color: Color(0xFF3b82f6)),
                          const SizedBox(width: 8),
                          const Text('Chọn chủ đề',
                            style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                          const Spacer(),
                          Text('${_selectedTags.length}/3',
                            style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                          const SizedBox(width: 8),
                          TextButton(
                            onPressed: () => Navigator.pop(ctx),
                            child: const Text('Xong',
                              style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 1),
                    Expanded(
                      child: _loadingCategories
                          ? const Center(child: CircularProgressIndicator())
                          : ListView.builder(
                              controller: scrollCtrl,
                              itemCount: _categoryGroups.length,
                              itemBuilder: (_, gi) {
                                final group = _categoryGroups[gi];
                                final groupName = group['group'] ?? '';
                                final categories = (group['items'] as List?) ?? [];
                                return Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Padding(
                                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
                                      child: Text(groupName,
                                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.grey[700])),
                                    ),
                                    Padding(
                                      padding: const EdgeInsets.symmetric(horizontal: 12),
                                      child: Wrap(
                                        spacing: 8, runSpacing: 6,
                                        children: categories.map<Widget>((cat) {
                                          final slug = cat['slug'] as String;
                                          final selected = _selectedTags.contains(slug);
                                          final disabled = !selected && _selectedTags.length >= 3;
                                          return FilterChip(
                                            label: Text(
                                              '${cat['icon'] ?? ''} ${cat['name'] ?? slug}',
                                              style: TextStyle(fontSize: 12,
                                                color: disabled ? Colors.grey : selected ? Colors.white : Colors.black87),
                                            ),
                                            selected: selected,
                                            onSelected: disabled ? null : (val) {
                                              setState(() {
                                                if (val) { _selectedTags.add(slug); } else { _selectedTags.remove(slug); }
                                              });
                                              setModalState(() {});
                                            },
                                            selectedColor: const Color(0xFF3b82f6),
                                            checkmarkColor: Colors.white,
                                            backgroundColor: disabled ? Colors.grey.shade100 : Colors.grey.shade50,
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(16),
                                              side: BorderSide(color: selected ? const Color(0xFF3b82f6) : Colors.grey.shade300),
                                            ),
                                          );
                                        }).toList(),
                                      ),
                                    ),
                                  ],
                                );
                              },
                            ),
                    ),
                  ],
                );
              },
            );
          },
        );
      },
    );
  }
}