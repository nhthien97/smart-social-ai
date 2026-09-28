import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../models/post_model.dart';
import '../../providers/post_provider.dart';

class EditPostScreen extends StatefulWidget {
  final Post post;

  const EditPostScreen({super.key, required this.post});

  @override
  State<EditPostScreen> createState() => _EditPostScreenState();
}

class _EditPostScreenState extends State<EditPostScreen> {
  late TextEditingController _contentController;
  late String _visibility;
  late List<String> _mediaUrls;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _contentController = TextEditingController(text: widget.post.content ?? '');
    _visibility = widget.post.visibility ?? 'public';
    _mediaUrls = List<String>.from(widget.post.mediaUrls ?? []);
  }

  @override
  void dispose() {
    _contentController.dispose();
    super.dispose();
  }

  void _removeImage(int index) {
    setState(() => _mediaUrls.removeAt(index));
  }

  IconData _getVisibilityIcon() {
    switch (_visibility) {
      case 'friends':
        return Icons.people;
      case 'private':
        return Icons.lock;
      default:
        return Icons.public;
    }
  }

  String _getVisibilityLabel() {
    switch (_visibility) {
      case 'friends':
        return 'Bạn bè';
      case 'private':
        return 'Chỉ mình tôi';
      default:
        return 'Công khai';
    }
  }

  void _showVisibilityPicker() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.only(bottom: 12),
                child: Text(
                  'Ai có thể xem bài viết này?',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
              ListTile(
                leading: const Icon(Icons.public, color: Color(0xFF3b82f6)),
                title: const Text('Công khai'),
                subtitle: const Text('Mọi người đều có thể xem'),
                trailing: _visibility == 'public'
                    ? const Icon(Icons.check, color: Color(0xFF3b82f6))
                    : null,
                onTap: () {
                  setState(() => _visibility = 'public');
                  Navigator.pop(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.people, color: Color(0xFF10b981)),
                title: const Text('Bạn bè'),
                subtitle: const Text('Chỉ bạn bè mới xem được'),
                trailing: _visibility == 'friends'
                    ? const Icon(Icons.check, color: Color(0xFF10b981))
                    : null,
                onTap: () {
                  setState(() => _visibility = 'friends');
                  Navigator.pop(context);
                },
              ),
              ListTile(
                leading: const Icon(Icons.lock, color: Colors.orange),
                title: const Text('Chỉ mình tôi'),
                subtitle: const Text('Chỉ bạn mới xem được'),
                trailing: _visibility == 'private'
                    ? const Icon(Icons.check, color: Colors.orange)
                    : null,
                onTap: () {
                  setState(() => _visibility = 'private');
                  Navigator.pop(context);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _save() async {
    final content = _contentController.text.trim();

    if (content.isEmpty && _mediaUrls.isEmpty) {
      Fluttertoast.showToast(
        msg: 'Bài viết phải có nội dung hoặc ảnh',
        backgroundColor: Colors.orange,
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final postProvider = Provider.of<PostProvider>(context, listen: false);
      final updated = await postProvider.updatePost(
        postId: widget.post.id!,
        content: content.isNotEmpty ? content : null,
        mediaUrls: _mediaUrls,
        visibility: _visibility,
      );

      if (updated != null) {
        Fluttertoast.showToast(
          msg: 'Đã cập nhật bài viết',
          backgroundColor: Colors.green,
        );
        if (mounted) Navigator.pop(context, updated);
      } else {
        throw Exception('Không thể cập nhật bài viết');
      }
    } catch (e) {
      Fluttertoast.showToast(
        msg: 'Lỗi: ${e.toString().replaceAll('Exception: ', '')}',
        backgroundColor: Colors.red,
        toastLength: Toast.LENGTH_LONG,
      );
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Chỉnh sửa bài viết'),
        actions: [
          _isSaving
              ? const Padding(
                  padding: EdgeInsets.all(14),
                  child: SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                )
              : TextButton(
                  onPressed: _save,
                  child: const Text(
                    'Lưu',
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
            // Visibility picker
            GestureDetector(
              onTap: _isSaving ? null : _showVisibilityPicker,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(_getVisibilityIcon(), size: 16, color: Colors.grey[700]),
                    const SizedBox(width: 6),
                    Text(
                      _getVisibilityLabel(),
                      style: TextStyle(fontSize: 14, color: Colors.grey[700]),
                    ),
                    const SizedBox(width: 4),
                    Icon(Icons.arrow_drop_down, size: 18, color: Colors.grey[700]),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Content input
            TextField(
              controller: _contentController,
              maxLines: null,
              minLines: 4,
              enabled: !_isSaving,
              decoration: const InputDecoration(
                hintText: 'Nội dung bài viết...',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.all(12),
              ),
              style: const TextStyle(fontSize: 16),
            ),
            const SizedBox(height: 16),

            // Image management
            if (_mediaUrls.isNotEmpty) ...[
              Row(
                children: [
                  const Text(
                    'Ảnh đính kèm',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '(nhấn × để xóa)',
                    style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  crossAxisSpacing: 6,
                  mainAxisSpacing: 6,
                ),
                itemCount: _mediaUrls.length,
                itemBuilder: (context, index) {
                  return Stack(
                    fit: StackFit.expand,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: CachedNetworkImage(
                          imageUrl: _mediaUrls[index],
                          fit: BoxFit.cover,
                          placeholder: (_, __) => Container(
                            color: Colors.grey.shade200,
                            child: const Center(
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          ),
                          errorWidget: (_, __, ___) => Container(
                            color: Colors.grey.shade200,
                            child: const Icon(Icons.broken_image, color: Colors.grey),
                          ),
                        ),
                      ),
                      if (!_isSaving)
                        Positioned(
                          top: 4,
                          right: 4,
                          child: GestureDetector(
                            onTap: () => _removeImage(index),
                            child: Container(
                              decoration: const BoxDecoration(
                                color: Colors.black54,
                                shape: BoxShape.circle,
                              ),
                              padding: const EdgeInsets.all(4),
                              child: const Icon(
                                Icons.close,
                                size: 14,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                    ],
                  );
                },
              ),
            ],
          ],
        ),
      ),
    );
  }
}
